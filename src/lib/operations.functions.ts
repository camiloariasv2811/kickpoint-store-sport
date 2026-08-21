import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InventoryRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  size: string;
  color: string | null;
  sku: string | null;
  stock: number;
  active: boolean;
  cost: number;
  retail_price: number;
  low_stock_threshold: number;
};

export type MovementRow = {
  id: string;
  type: string;
  quantity: number;
  stock_after: number | null;
  reference: string | null;
  note: string | null;
  created_at: string;
  variant: {
    size: string;
    color: string | null;
    product: { name: string } | null;
  } | null;
};

/** Inventario plano por variante, con datos del producto para alertas de stock bajo. */
export const listInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("product_variants")
      .select(
        "id, product_id, size, color, sku, stock, active, product:products(name, cost, retail_price, low_stock_threshold)",
      )
      .order("stock");
    if (error) throw new Error(error.message);

    type Raw = {
      id: string;
      product_id: string;
      size: string;
      color: string | null;
      sku: string | null;
      stock: number;
      active: boolean;
      product: {
        name: string;
        cost: number;
        retail_price: number;
        low_stock_threshold: number;
      } | null;
    };

    return ((data ?? []) as unknown as Raw[]).map<InventoryRow>((v) => ({
      variant_id: v.id,
      product_id: v.product_id,
      product_name: v.product?.name ?? "Producto",
      size: v.size,
      color: v.color,
      sku: v.sku,
      stock: v.stock,
      active: v.active,
      cost: Number(v.product?.cost ?? 0),
      retail_price: Number(v.product?.retail_price ?? 0),
      low_stock_threshold: Number(v.product?.low_stock_threshold ?? 3),
    }));
  });

export const listMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inventory_movements")
      .select(
        "id, type, quantity, stock_after, reference, note, created_at, variant:product_variants(size, color, product:products(name))",
      )
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MovementRow[];
  });

const MOVEMENT_TYPES = ["entrada", "salida", "ajuste"] as const;

/** Registra una entrada, salida o ajuste manual de inventario y recalcula el stock. */
export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { variantId: string; type: string; quantity: number; note?: string }) => {
      if (!MOVEMENT_TYPES.includes(data.type as (typeof MOVEMENT_TYPES)[number])) {
        throw new Error("Tipo de movimiento inválido");
      }
      const quantity = Math.floor(Number(data.quantity));
      if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Cantidad inválida");
      if (data.type !== "ajuste" && quantity <= 0) throw new Error("Cantidad inválida");
      return { ...data, quantity };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: variant, error } = await supabase
      .from("product_variants")
      .select("id, stock")
      .eq("id", data.variantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!variant) throw new Error("Variante no encontrada");

    const stockAfter =
      data.type === "entrada"
        ? variant.stock + data.quantity
        : data.type === "salida"
          ? Math.max(0, variant.stock - data.quantity)
          : data.quantity;

    const { error: updateError } = await supabase
      .from("product_variants")
      .update({ stock: stockAfter })
      .eq("id", variant.id);
    if (updateError) throw new Error(updateError.message);

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      variant_id: variant.id,
      type: data.type,
      quantity: data.type === "ajuste" ? Math.abs(stockAfter - variant.stock) : data.quantity,
      stock_after: stockAfter,
      note: (data.note ?? "").trim().slice(0, 300) || null,
      created_by: userId,
    });
    if (movementError) throw new Error(movementError.message);

    return { ok: true as const, stock: stockAfter };
  });

export type PosItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

export type SaleRow = {
  id: string;
  sale_number: string;
  channel: string;
  total: number;
  cost_total: number;
  payment_method_code: string | null;
  created_at: string;
  customer: { first_name: string; last_name: string | null; whatsapp: string | null } | null;
  items: {
    id: string;
    product_name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    subtotal: number;
  }[];
};

const SALE_SELECT = `
  id, sale_number, channel, total, cost_total, payment_method_code, created_at,
  customer:customers ( first_name, last_name, whatsapp ),
  items:sale_items ( id, product_name, size, color, quantity, unit_price, unit_cost, subtotal )
`;

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales")
      .select(SALE_SELECT)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SaleRow[];
  });

/** Registra una venta presencial: valida stock, crea la venta y descuenta inventario. */
export const createPosSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      items: PosItemInput[];
      paymentMethodCode?: string | null;
      customer?: { firstName: string; lastName?: string; whatsapp?: string } | null;
      note?: string;
    }) => {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Agrega al menos un producto");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const variantIds = data.items.map((i) => i.variantId);
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, size, color, stock, product_id, product:products(name, cost)")
      .in("id", variantIds);
    if (variantsError) throw new Error(variantsError.message);

    type RawVariant = {
      id: string;
      size: string;
      color: string | null;
      stock: number;
      product_id: string;
      product: { name: string; cost: number } | null;
    };
    const byId = new Map(
      ((variants ?? []) as unknown as RawVariant[]).map((v) => [v.id, v] as const),
    );

    const lines = data.items.map((item) => {
      const variant = byId.get(item.variantId);
      if (!variant) throw new Error("Producto no disponible");
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      if (variant.stock < quantity) {
        throw new Error(`Stock insuficiente para ${variant.product?.name ?? "el producto"} (${variant.size})`);
      }
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const unitCost = Number(variant.product?.cost ?? 0);
      return {
        variant,
        quantity,
        unitPrice,
        unitCost,
        subtotal: Number((unitPrice * quantity).toFixed(2)),
      };
    });

    const total = Number(lines.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2));
    const costTotal = Number(
      lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0).toFixed(2),
    );

    let customerId: string | null = null;
    const firstName = data.customer?.firstName?.trim();
    if (firstName) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          first_name: firstName,
          last_name: data.customer?.lastName?.trim() || null,
          whatsapp: data.customer?.whatsapp?.trim() || null,
        })
        .select("id")
        .single();
      if (customerError) throw new Error(customerError.message);
      customerId = customer.id;
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        channel: "presencial",
        total,
        cost_total: costTotal,
        payment_method_code: data.paymentMethodCode || null,
        customer_id: customerId,
        created_by: userId,
      })
      .select("id, sale_number")
      .single();
    if (saleError) throw new Error(saleError.message);

    const { error: itemsError } = await supabase.from("sale_items").insert(
      lines.map((l) => ({
        sale_id: sale.id,
        product_id: l.variant.product_id,
        variant_id: l.variant.id,
        product_name: l.variant.product?.name ?? "Producto",
        size: l.variant.size,
        color: l.variant.color,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        unit_cost: l.unitCost,
        subtotal: l.subtotal,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    for (const line of lines) {
      const stockAfter = Math.max(0, line.variant.stock - line.quantity);
      await supabase
        .from("product_variants")
        .update({ stock: stockAfter })
        .eq("id", line.variant.id);
      await supabase.from("inventory_movements").insert({
        variant_id: line.variant.id,
        type: "salida",
        quantity: line.quantity,
        stock_after: stockAfter,
        reference: sale.sale_number,
        note: (data.note ?? "").trim().slice(0, 200) || "Venta presencial",
        created_by: userId,
      });
    }

    await supabase.from("audit_log").insert({
      user_id: userId,
      action: `Registró la venta presencial ${sale.sale_number}`,
      entity: "sales",
      entity_id: sale.id,
    });

    return { ok: true as const, saleNumber: sale.sale_number, total };
  });

export type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  orders: { total: number; is_wholesale: boolean; status: string; created_at: string }[];
  sales: { total: number; created_at: string }[];
};

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customers")
      .select(
        "id, first_name, last_name, whatsapp, phone, email, city, state, address, notes, created_at, orders(total, is_wholesale, status, created_at), sales(total, created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CustomerRow[];
  });

export const updateCustomerNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { customerId: string; notes: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({ notes: data.notes.trim().slice(0, 1000) || null })
      .eq("id", data.customerId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type ReportData = {
  from: string;
  to: string;
  salesCount: number;
  revenue: number;
  cost: number;
  profit: number;
  onlineRevenue: number;
  inStoreRevenue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  daily: { date: string; revenue: number }[];
};

/** Reporte consolidado de ventas (online + presencial) para un rango de fechas. */
export const getSalesReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string }) => data)
  .handler(async ({ data, context }): Promise<ReportData> => {
    const fromIso = new Date(`${data.from}T00:00:00.000Z`).toISOString();
    const toIso = new Date(`${data.to}T23:59:59.999Z`).toISOString();

    const { data: sales, error } = await context.supabase
      .from("sales")
      .select(
        "id, channel, total, cost_total, created_at, items:sale_items(product_name, quantity, subtotal)",
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso);
    if (error) throw new Error(error.message);

    type RawSale = {
      channel: string;
      total: number;
      cost_total: number;
      created_at: string;
      items: { product_name: string; quantity: number; subtotal: number }[];
    };
    const rows = (sales ?? []) as unknown as RawSale[];

    let revenue = 0;
    let cost = 0;
    let onlineRevenue = 0;
    let inStoreRevenue = 0;
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    const dailyMap = new Map<string, number>();

    for (const sale of rows) {
      const total = Number(sale.total ?? 0);
      revenue += total;
      cost += Number(sale.cost_total ?? 0);
      if (sale.channel === "presencial") inStoreRevenue += total;
      else onlineRevenue += total;

      const day = sale.created_at.slice(0, 10);
      dailyMap.set(day, Number(((dailyMap.get(day) ?? 0) + total).toFixed(2)));

      for (const item of sale.items ?? []) {
        const current = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: current.quantity + Number(item.quantity ?? 0),
          revenue: Number((current.revenue + Number(item.subtotal ?? 0)).toFixed(2)),
        });
      }
    }

    return {
      from: data.from,
      to: data.to,
      salesCount: rows.length,
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number((revenue - cost).toFixed(2)),
      onlineRevenue: Number(onlineRevenue.toFixed(2)),
      inStoreRevenue: Number(inStoreRevenue.toFixed(2)),
      topProducts: [...productMap.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      daily: [...dailyMap.entries()]
        .map(([date, revenueOfDay]) => ({ date, revenue: revenueOfDay }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
