import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Returns the caller's staff status; grants admin to the very first user when no admin exists. */
export const claimAdminIfFirst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);

    if ((count ?? 0) > 0) return { granted: false as const };

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      action: "Se asignó el primer administrador",
      entity: "user_roles",
      entity_id: context.userId,
    });

    return { granted: true as const };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

/** Estados de orden que todavía requieren atención administrativa (nuevo pedido o pago sin verificar). */
const PENDING_ORDER_STATUSES = ["pedido_recibido", "pago_pendiente"];

/** Cuenta los pedidos que requieren atención administrativa (para la burbuja del sidebar). */
export const countPendingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", PENDING_ORDER_STATUSES);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export type AdminPaymentMethod = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  instructions: string | null;
  details: Record<string, string>;
  sort_order: number;
};

/** Lista TODOS los métodos de pago (activos e inactivos) para el panel de administración. */
export const listAllPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_methods")
      .select("id, code, name, active, instructions, details, sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AdminPaymentMethod[];
  });

/** Crea un método de pago. Protegido por RLS ("pm staff all") además del middleware de auth. */
export const createPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      code: string;
      name: string;
      active: boolean;
      instructions: string;
      details: Record<string, string>;
      sort_order: number;
    }) => {
      const code = data.code
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
      const name = data.name.trim();
      if (!code) throw new Error("El código es obligatorio");
      if (!name) throw new Error("El nombre es obligatorio");
      return { ...data, code, name };
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payment_methods").insert({
      code: data.code,
      name: data.name,
      active: data.active,
      instructions: data.instructions.trim() || null,
      details: data.details,
      sort_order: data.sort_order,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Edita un método de pago existente (incluye activar/desactivar y reordenar). Sin DELETE físico. */
export const updatePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      code: string;
      name: string;
      active: boolean;
      instructions: string;
      details: Record<string, string>;
      sort_order: number;
    }) => {
      const code = data.code
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
      const name = data.name.trim();
      if (!code) throw new Error("El código es obligatorio");
      if (!name) throw new Error("El nombre es obligatorio");
      return { ...data, code, name };
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("payment_methods")
      .update({
        code: data.code,
        name: data.name,
        active: data.active,
        instructions: data.instructions.trim() || null,
        details: data.details,
        sort_order: data.sort_order,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
