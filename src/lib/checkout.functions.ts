import { createServerFn } from "@tanstack/react-start";

import { createPublicClient } from "./supabase-public.server";

export type PaymentMethod = {
  code: string;
  name: string;
  instructions: string | null;
  details: Record<string, string>;
};

export const listPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("code, name, instructions, details")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentMethod[];
});

export type CheckoutInput = {
  customer: {
    firstName: string;
    lastName: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    state: string;
    notes: string;
  };
  paymentMethod: string;
  lines: { variantId: string; quantity: number }[];
};

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => {
    if (!data?.customer?.firstName?.trim()) throw new Error("Falta el nombre");
    if (!data.customer.whatsapp?.trim()) throw new Error("Falta el WhatsApp");
    if (!data.customer.city?.trim() || !data.customer.address?.trim())
      throw new Error("Falta la dirección de entrega");
    if (!Array.isArray(data.lines) || data.lines.length === 0) throw new Error("Carrito vacío");
    if (data.lines.length > 60) throw new Error("Demasiados productos");
    if (!data.paymentMethod) throw new Error("Selecciona un método de pago");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.lines.map((l) => l.variantId))];
    const { data: variants, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select(
        "id, size, color, stock, active, product:products(id, name, images, retail_price, wholesale_price, wholesale_min_qty, cost, active)",
      )
      .in("id", ids);
    if (variantError) throw new Error(variantError.message);

    const items = data.lines.map((line) => {
      const variant = (variants ?? []).find((v) => v.id === line.variantId) as
        | {
            id: string;
            size: string;
            color: string | null;
            stock: number;
            active: boolean;
            product: {
              id: string;
              name: string;
              images: string[];
              retail_price: number;
              wholesale_price: number | null;
              wholesale_min_qty: number;
              cost: number;
              active: boolean;
            } | null;
          }
        | undefined;
      if (!variant || !variant.product || !variant.active || !variant.product.active)
        throw new Error("Un producto de tu carrito ya no está disponible");

      const quantity = Math.max(1, Math.floor(line.quantity));
      if (quantity > variant.stock)
        throw new Error(`Stock insuficiente para ${variant.product.name} talla ${variant.size}`);

      const wholesale = variant.product.wholesale_price;
      const unit =
        wholesale && quantity >= variant.product.wholesale_min_qty
          ? Number(wholesale)
          : Number(variant.product.retail_price);

      return {
        variant_id: variant.id,
        product_id: variant.product.id,
        product_name: variant.product.name,
        image_url: variant.product.images?.[0] ?? null,
        size: variant.size,
        color: variant.color,
        unit_price: unit,
        unit_cost: Number(variant.product.cost ?? 0),
        quantity,
        subtotal: Number((unit * quantity).toFixed(2)),
        isWholesale: Boolean(wholesale && quantity >= variant.product.wholesale_min_qty),
      };
    });

    const subtotal = Number(items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        first_name: data.customer.firstName.trim().slice(0, 80),
        last_name: data.customer.lastName.trim().slice(0, 80) || null,
        whatsapp: data.customer.whatsapp.trim().slice(0, 40),
        phone: data.customer.whatsapp.trim().slice(0, 40),
        email: data.customer.email.trim().slice(0, 120) || null,
        address: data.customer.address.trim().slice(0, 300),
        city: data.customer.city.trim().slice(0, 80),
        state: data.customer.state.trim().slice(0, 80) || null,
        notes: data.customer.notes.trim().slice(0, 500) || null,
      })
      .select("id")
      .single();
    if (customerError) throw new Error(customerError.message);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customer.id,
        status: "pedido_recibido",
        channel: "online",
        payment_method_code: data.paymentMethod,
        subtotal,
        total: subtotal,
        is_wholesale: items.some((i) => i.isWholesale),
        notes: data.customer.notes.trim().slice(0, 500) || null,
      })
      .select("id, order_number, total")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      items.map(({ isWholesale: _isWholesale, ...item }) => ({
        ...item,
        order_id: order.id,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      method_code: data.paymentMethod,
      amount: subtotal,
      status: "pendiente",
    });
    if (paymentError) throw new Error(paymentError.message);

    return { orderNumber: order.order_number, total: Number(order.total) };
  });

export type PublicOrder = {
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  payment_method_code: string | null;
  payment_status: string | null;
  proof_uploaded: boolean;
  rejection_reason: string | null;
  items: {
    product_name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    image_url: string | null;
  }[];
};

export const getOrderByNumber = createServerFn({ method: "GET" })
  .inputValidator((data: { orderNumber: string }) => ({
    orderNumber: String(data?.orderNumber ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 24),
  }))
  .handler(async ({ data }) => {
    if (!/^KP-\d{4}-\d{6}$/.test(data.orderNumber)) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, payment_method_code, items:order_items(product_name, size, color, quantity, unit_price, subtotal, image_url), payments(status, proof_url, rejection_reason, created_at)",
      )
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    const payments = (order.payments ?? []) as {
      status: string;
      proof_url: string | null;
      rejection_reason: string | null;
    }[];
    const payment = payments[payments.length - 1];

    return {
      order_number: order.order_number,
      status: order.status,
      total: Number(order.total),
      created_at: order.created_at,
      payment_method_code: order.payment_method_code,
      payment_status: payment?.status ?? null,
      proof_uploaded: Boolean(payment?.proof_url),
      rejection_reason: payment?.rejection_reason ?? null,
      items: (order.items ?? []).map((i) => ({
        product_name: i.product_name,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        image_url: i.image_url,
      })),
    } satisfies PublicOrder;
  });

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      orderNumber: string;
      reference: string;
      fileName: string;
      contentType: string;
      dataBase64: string;
    }) => {
      if (!/^KP-\d{4}-\d{6}$/.test(String(data?.orderNumber ?? "").toUpperCase()))
        throw new Error("Número de pedido inválido");
      if (!data.dataBase64) throw new Error("Falta el comprobante");
      if (data.dataBase64.length > 8_000_000) throw new Error("La imagen supera 5 MB");
      if (!/^image\/(png|jpe?g|webp)$/.test(data.contentType) && data.contentType !== "application/pdf")
        throw new Error("Formato no permitido (usa JPG, PNG, WEBP o PDF)");
      return { ...data, orderNumber: data.orderNumber.toUpperCase() };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, payments(id, status)")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("No encontramos ese número de pedido");

    const bytes = Buffer.from(data.dataBase64, "base64");
    const ext = data.contentType === "application/pdf" ? "pdf" : data.contentType.split("/")[1];
    const path = `${order.order_number}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("comprobantes")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const payments = (order.payments ?? []) as { id: string; status: string }[];
    const pending = payments.find((p) => p.status !== "verificado") ?? payments[0];

    if (pending) {
      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({
          proof_url: path,
          proof_uploaded_at: new Date().toISOString(),
          reference: data.reference.trim().slice(0, 120) || null,
          status: "pendiente",
          rejection_reason: null,
        })
        .eq("id", pending.id);
      if (updateError) throw new Error(updateError.message);
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "pago_pendiente" })
      .eq("id", order.id)
      .eq("status", "pedido_recibido");

    return { ok: true as const };
  });
