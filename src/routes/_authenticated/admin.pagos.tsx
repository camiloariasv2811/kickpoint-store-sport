import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProofUrl, listOrders, reviewPayment, type AdminOrder } from "@/lib/orders.functions";
import { moneyExact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pagos")({
  component: Page,
});

type Row = { order: AdminOrder; payment: AdminOrder["payments"][number] };

function Page() {
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => listOrders() });

  const rows: Row[] = (orders.data ?? []).flatMap((order) =>
    order.payments.map((payment) => ({ order, payment })),
  );
  const list = rows
    .filter((r) => (showAll ? true : r.payment.status === "pendiente"))
    .sort((a, b) => b.payment.created_at.localeCompare(a.payment.created_at));

  return (
    <AdminShell title="Pagos" subtitle="Verificación de Pago Móvil, USDT y efectivo">
      <div className="flex items-center gap-2">
        <Button variant={showAll ? "ghost" : "hero"} size="sm" onClick={() => setShowAll(false)}>
          Por verificar
        </Button>
        <Button variant={showAll ? "hero" : "ghost"} size="sm" onClick={() => setShowAll(true)}>
          Todos
        </Button>
      </div>

      {orders.isLoading && (
        <div className="surface-card mt-4 flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando pagos…
        </div>
      )}

      {!orders.isLoading && list.length === 0 && (
        <div className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          No hay pagos {showAll ? "registrados" : "por verificar"}.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {list.map((row) => (
          <PaymentRow
            key={row.payment.id}
            row={row}
            onChanged={() => {
              void orders.refetch();
              void queryClient.invalidateQueries({ queryKey: ["admin", "pending-orders-count"] });
            }}
          />
        ))}
      </div>
    </AdminShell>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground",
  verificado: "bg-primary/15 text-primary",
  rechazado: "bg-destructive/15 text-destructive",
};

function PaymentRow({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const { order, payment } = row;
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function openProof() {
    if (!payment.proof_url) return;
    try {
      const { url } = await getProofUrl({ data: { path: payment.proof_url } });
      window.open(url, "_blank", "noreferrer");
    } catch (error) {
      toast.error("No pudimos abrir el comprobante", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function review(approve: boolean) {
    setBusy(true);
    try {
      await reviewPayment({ data: { paymentId: payment.id, approve, reason } });
      toast.success(approve ? "Pago verificado" : "Pago rechazado");
      setRejecting(false);
      setReason("");
      onChanged();
    } catch (error) {
      toast.error("No pudimos procesar el pago", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-display text-lg">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {order.customer
              ? `${order.customer.first_name} ${order.customer.last_name ?? ""}`.trim()
              : "Sin cliente"}{" "}
            · {payment.method_code ?? "-"}
            {payment.reference ? ` · Ref ${payment.reference}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_STYLES[payment.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {payment.status}
          </span>
          <p className="text-display text-xl text-primary">{moneyExact(payment.amount)}</p>
        </div>
      </div>

      {payment.rejection_reason && (
        <p className="mt-2 text-xs text-destructive">Motivo: {payment.rejection_reason}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {payment.proof_url ? (
          <Button variant="outlineGlow" size="sm" onClick={() => void openProof()}>
            <ExternalLink className="size-4" /> Ver comprobante
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Sin comprobante cargado</span>
        )}
        {payment.status !== "verificado" && (
          <>
            <Button variant="hero" size="sm" disabled={busy} onClick={() => void review(true)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Aprobar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRejecting((v) => !v)}>
              <X className="size-4" /> Rechazar
            </Button>
          </>
        )}
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del rechazo"
            className="h-10"
          />
          <Button variant="dark" size="sm" disabled={busy} onClick={() => void review(false)}>
            Confirmar rechazo
          </Button>
        </div>
      )}
    </div>
  );
}
