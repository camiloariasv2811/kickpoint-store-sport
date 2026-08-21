import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  channel: string;
  payment_method_code: string | null;
  subtotal: number;
  total: number;
  is_wholesale: boolean;
  inventory_applied: boolean;
  notes: string | null;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: {
    id: string;
    product_name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    subtotal: number;
    variant_id: string | null;
    image_url: string | null;
  }[];
  payments: {
    id: string;
    status: string;
    amount: number;
    method_code: string | null;
    reference: string | null;
    proof_url: string | null;
    proof_uploaded_at: string | null;
    rejection_reason: string | null;
    created_at: string;
  }[];
};

const ORDER_SELECT = `
  id, order_number, status, channel, payment_method_code, subtotal, total, is_wholesale,
  inventory_applied, notes, created_at,
  customer:customers ( first_name, last_name, whatsapp, email, address, city, state ),
  items:order_items ( id, product_name, size, color, quantity, unit_price, unit_cost, subtotal, variant_id, image_url ),
  payments ( id, status, amount, method_code, reference, proof_url, proof_uploaded_at, rejection_reason, created_at )
`;

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AdminOrder[];
  });

const ALLOWED_STATUSES = [
  "pedido_recibido",
  "pago_pendiente",
  "pago_verificado",
  "preparando_pedido",
  "empacando_pedido",
  "pedido_enviado",
  "pedido_entregado",
];

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; status: string }) => {
    if (!ALLOWED_STATUSES.includes(data.status)) throw new Error("Estado inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: `Cambió el estado del pedido a ${data.status}`,
      entity: "orders",
      entity_id: data.orderId,
    });

    return { ok: true as const };
  });

/** Approves or rejects a payment proof. Approving verifies the payment and applies inventory once. */
export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string; approve: boolean; reason?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: payment, error } = await supabase
      .from("payments")
      .select("id, order_id, amount")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Pago no encontrado");

    if (!data.approve) {
      const { error: rejectError } = await supabase
        .from("payments")
        .update({
          status: "rechazado",
          rejection_reason: (data.reason ?? "").trim().slice(0, 300) || "Comprobante no válido",
          verified_at: new Date().toISOString(),
          verified_by: userId,
        })
        .eq("id", payment.id);
      if (rejectError) throw new Error(rejectError.message);

      await supabase.from("orders").update({ status: "pago_pendiente" }).eq("id", payment.order_id);
      return { ok: true as const, approved: false as const };
    }

    const { error: approveError } = await supabase
      .from("payments")
      .update({
        status: "verificado",
        rejection_reason: null,
        verified_at: new Date().toISOString(),
        verified_by: userId,
      })
      .eq("id", payment.id);
    if (approveError) throw new Error(approveError.message);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, inventory_applied, customer_id, payment_method_code, total, items:order_items(product_id, variant_id, product_name, size, color, quantity, unit_price, unit_cost, subtotal)",
      )
      .eq("id", payment.order_id)
      .single();
    if (orderError) throw new Error(orderError.message);

    if (!order.inventory_applied) {
      for (const item of order.items ?? []) {
        if (!item.variant_id) continue;
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, stock")
          .eq("id", item.variant_id)
          .single();
        if (!variant) continue;
        const stockAfter = Math.max(0, variant.stock - item.quantity);
        await supabase.from("product_variants").update({ stock: stockAfter }).eq("id", variant.id);
        await supabase.from("inventory_movements").insert({
          variant_id: variant.id,
          type: "salida",
          quantity: item.quantity,
          stock_after: stockAfter,
          reference: order.order_number,
          note: "Pago verificado",
          created_by: userId,
        });
      }

      // Registra la venta online para que aparezca en Ventas y Reportes.
      const costTotal = Number(
        (order.items ?? [])
          .reduce((sum, i) => sum + Number(i.unit_cost ?? 0) * Number(i.quantity ?? 0), 0)
          .toFixed(2),
      );
      const { data: sale } = await supabase
        .from("sales")
        .insert({
          channel: "online",
          order_id: order.id,
          customer_id: order.customer_id,
          payment_method_code: order.payment_method_code,
          total: Number(order.total ?? 0),
          cost_total: costTotal,
          created_by: userId,
        })
        .select("id")
        .single();

      if (sale) {
        await supabase.from("sale_items").insert(
          (order.items ?? []).map((i) => ({
            sale_id: sale.id,
            product_id: i.product_id,
            variant_id: i.variant_id,
            product_name: i.product_name,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unit_price: i.unit_price,
            unit_cost: i.unit_cost,
            subtotal: i.subtotal,
          })),
        );
      }

      await supabase
        .from("orders")
        .update({ inventory_applied: true, status: "pago_verificado" })
        .eq("id", order.id);
    } else {
      await supabase.from("orders").update({ status: "pago_verificado" }).eq("id", order.id);
    }


    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "Verificó un pago",
      entity: "payments",
      entity_id: payment.id,
    });

    return { ok: true as const, approved: true as const };
  });

/** Returns a short-lived signed URL for a payment proof stored in the private bucket. */
export const getProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isStaff, error } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isStaff) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("comprobantes")
      .createSignedUrl(data.path, 300);
    if (signError) throw new Error(signError.message);
    return { url: signed.signedUrl };
  });
