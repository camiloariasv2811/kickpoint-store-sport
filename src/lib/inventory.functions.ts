import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  baseSku: string | null;
  size: string;
  color: string | null;
  sku: string | null;
  stock: number;
  active: boolean;
  lowStockThreshold: number;
  categoryName: string | null;
  status: "ok" | "bajo" | "agotado";
};

const INVENTORY_SELECT = `
  id, name, base_sku, low_stock_threshold,
  category:categories ( name ),
  variants:product_variants ( id, size, color, sku, stock, active )
`;

/** Lista el inventario a nivel de variante (talla/color), para búsqueda y filtros en el panel. */
export const listInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("products").select(INVENTORY_SELECT);
    if (error) throw new Error(error.message);

    const rows: InventoryRow[] = [];
    for (const p of (data ?? []) as unknown as {
      id: string;
      name: string;
      base_sku: string | null;
      low_stock_threshold: number | null;
      category: { name: string } | null;
      variants: {
        id: string;
        size: string;
        color: string | null;
        sku: string | null;
        stock: number;
        active: boolean;
      }[];
    }[]) {
      const threshold = p.low_stock_threshold ?? 5;
      for (const v of p.variants ?? []) {
        if (!v.active) continue;
        const status: InventoryRow["status"] =
          v.stock <= 0 ? "agotado" : v.stock <= threshold ? "bajo" : "ok";
        rows.push({
          variantId: v.id,
          productId: p.id,
          productName: p.name,
          baseSku: p.base_sku,
          size: v.size,
          color: v.color,
          sku: v.sku,
          stock: v.stock,
          active: v.active,
          lowStockThreshold: threshold,
          categoryName: p.category?.name ?? null,
          status,
        });
      }
    }

    rows.sort((a, b) => a.productName.localeCompare(b.productName) || a.size.localeCompare(b.size));
    return rows;
  });

export type InventoryMovementRow = {
  id: string;
  variantId: string;
  productName: string;
  size: string;
  color: string | null;
  sku: string | null;
  type: string;
  quantity: number;
  unitCost: number | null;
  stockAfter: number | null;
  reference: string | null;
  note: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

/** Historial/kárdex de movimientos, opcionalmente filtrado por variante o tipo. */
export const listInventoryMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { variantId?: string | undefined; type?: string; limit?: number }) => data)
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("inventory_movements")
      .select(
        `
        id, variant_id, type, quantity, unit_cost, stock_after, reference, note, created_by, created_at,
        variant:product_variants ( size, color, sku, product:products ( name ) )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (data.variantId) query = query.eq("variant_id", data.variantId);
    if (data.type) query = query.eq("type", data.type);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const creatorIds = [
      ...new Set((rows ?? []).map((r) => r.created_by).filter(Boolean)),
    ] as string[];
    const emailById = new Map<string, string>();
    if (creatorIds.length > 0) {
      // profiles solo permite "leer mi propio perfil" vía RLS; para mostrar el responsable de
      // movimientos ajenos usamos el cliente de servicio. Solo llegamos aquí si la consulta de
      // movimientos de arriba ya pasó la RLS "movements staff all", así que el caller es staff.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", creatorIds);
      for (const p of profiles ?? []) {
        if (p.email) emailById.set(p.id, p.email as string);
      }
    }

    return (rows ?? []).map((r) => {
      const variant = r.variant as unknown as {
        size: string;
        color: string | null;
        sku: string | null;
        product: { name: string } | null;
      } | null;
      return {
        id: r.id,
        variantId: r.variant_id,
        productName: variant?.product?.name ?? "Producto",
        size: variant?.size ?? "—",
        color: variant?.color ?? null,
        sku: variant?.sku ?? null,
        type: r.type,
        quantity: Number(r.quantity),
        unitCost: r.unit_cost !== null ? Number(r.unit_cost) : null,
        stockAfter: r.stock_after !== null ? Number(r.stock_after) : null,
        reference: r.reference,
        note: r.note,
        createdBy: r.created_by,
        createdByEmail: r.created_by ? (emailById.get(r.created_by) ?? null) : null,
        createdAt: r.created_at,
      } satisfies InventoryMovementRow;
    });
  });

type MovementInput = {
  variantId: string;
  type: "entrada" | "salida" | "ajuste";
  /** Para entrada/salida: cantidad a mover (siempre positiva). Para ajuste: el nuevo stock exacto. */
  quantity: number;
  unitCost?: number | null;
  reference?: string;
  note?: string;
};

/**
 * Registra un movimiento de inventario (entrada, salida o ajuste) y actualiza
 * product_variants.stock en el mismo flujo, para que nunca queden desincronizados.
 * Sigue exactamente el mismo patrón que reviewPayment() ya usa en orders.functions.ts
 * (actualizar stock primero, luego insertar el movimiento con el stock_after resultante).
 */
export const recordInventoryMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: MovementInput) => {
    if (!data.variantId) throw new Error("Falta la variante");
    if (!["entrada", "salida", "ajuste"].includes(data.type)) {
      throw new Error("Tipo de movimiento inválido");
    }
    if (!Number.isFinite(data.quantity)) {
      throw new Error("La cantidad debe ser un número válido");
    }
    if (data.type !== "ajuste" && data.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }
    if (data.type === "ajuste" && data.quantity < 0) {
      throw new Error("El nuevo stock no puede ser negativo");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: variant, error: variantError } = await context.supabase
      .from("product_variants")
      .select("id, stock, active")
      .eq("id", data.variantId)
      .single();
    if (variantError) throw new Error(variantError.message);
    if (!variant) throw new Error("Variante no encontrada");

    const currentStock = Number(variant.stock ?? 0);
    let stockAfter: number;
    let loggedQuantity: number;

    if (data.type === "entrada") {
      stockAfter = currentStock + data.quantity;
      loggedQuantity = data.quantity;
    } else if (data.type === "salida") {
      if (data.quantity > currentStock) {
        throw new Error(
          `No hay suficiente stock: disponible ${currentStock}, se intentó retirar ${data.quantity}`,
        );
      }
      stockAfter = currentStock - data.quantity;
      loggedQuantity = data.quantity;
    } else {
      // ajuste: quantity es el nuevo stock exacto (kárdex de corrección)
      stockAfter = data.quantity;
      loggedQuantity = stockAfter - currentStock;
    }

    const { error: updateError } = await context.supabase
      .from("product_variants")
      .update({ stock: stockAfter })
      .eq("id", data.variantId);
    if (updateError) throw new Error(updateError.message);

    const { error: insertError } = await context.supabase.from("inventory_movements").insert({
      variant_id: data.variantId,
      type: data.type,
      quantity: loggedQuantity,
      unit_cost: data.unitCost ?? null,
      stock_after: stockAfter,
      reference: data.reference?.trim() || null,
      note: data.note?.trim() || null,
      created_by: context.userId,
    });
    if (insertError) throw new Error(insertError.message);

    return { ok: true as const, stockAfter };
  });
