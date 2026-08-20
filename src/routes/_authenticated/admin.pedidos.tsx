import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOrders, updateOrderStatus, type AdminOrder } from "@/lib/orders.functions";
import { moneyExact, whatsappLink } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => listOrders() });

  const list = (orders.data ?? []).filter((o) => {
    if (status && o.status !== status) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const name = `${o.customer?.first_name ?? ""} ${o.customer?.last_name ?? ""}`.toLowerCase();
    return o.order_number.toLowerCase().includes(q) || name.includes(q);
  });

  return (
    <AdminShell title="Pedidos" subtitle="Pedidos online, comprobantes y estados de envío">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número o cliente"
            className="h-11 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {orders.isLoading && (
        <div className="surface-card mt-4 flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando pedidos…
        </div>
      )}

      {!orders.isLoading && list.length === 0 && (
        <div className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          No hay pedidos con esos criterios.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {list.map((order) => (
          <OrderRow key={order.id} order={order} onChanged={() => void orders.refetch()} />
        ))}
      </div>
    </AdminShell>
  );
}

function OrderRow({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changeStatus(next: string) {
    setSaving(true);
    try {
      await updateOrderStatus({ data: { orderId: order.id, status: next } });
      toast.success("Estado actualizado", { description: ORDER_STATUS_LABELS[next] });
      onChanged();
    } catch (error) {
      toast.error("No pudimos actualizar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const paid = order.payments.some((p) => p.status === "verificado");

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-display text-lg hover:text-primary"
          >
            {order.order_number}
          </button>
          <p className="text-xs text-muted-foreground">
            {order.customer
              ? `${order.customer.first_name} ${order.customer.last_name ?? ""}`.trim()
              : "Sin cliente"}{" "}
            · {new Date(order.created_at).toLocaleDateString("es-VE")}
            {order.is_wholesale ? " · al mayor" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              paid ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {paid ? "Pago verificado" : "Pago pendiente"}
          </span>
          <p className="text-display text-xl text-primary">{moneyExact(order.total)}</p>
          <select
            value={order.status}
            disabled={saving}
            onChange={(e) => void changeStatus(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="text-eyebrow text-[0.65rem]">Productos</p>
            <ul className="mt-2 space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{item.product_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Talla {item.size ?? "-"} × {item.quantity}
                    </span>
                  </span>
                  <span className="font-semibold">{moneyExact(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <p className="text-eyebrow text-[0.65rem]">Entrega</p>
            <p className="mt-2 text-muted-foreground">
              {order.customer?.address ?? "-"}
              {order.customer?.city ? `, ${order.customer.city}` : ""}
              {order.customer?.state ? `, ${order.customer.state}` : ""}
            </p>
            {order.notes && <p className="mt-2 text-muted-foreground">Nota: {order.notes}</p>}
            {order.customer?.whatsapp && (
              <Button asChild variant="outlineGlow" size="sm" className="mt-3">
                <a
                  href={whatsappLink(
                    `Hola ${order.customer.first_name}, te escribimos de KICKPOINT por tu pedido ${order.order_number}.`,
                    order.customer.whatsapp.replace(/\D/g, ""),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
