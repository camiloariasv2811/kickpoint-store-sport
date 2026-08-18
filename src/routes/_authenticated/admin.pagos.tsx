import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/pagos")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Pagos" subtitle="Verificación de Pago Móvil, USDT y efectivo">
      <EmptyState
        title="Verificación de pagos"
        description="Bandeja de comprobantes por revisar, con aprobación o rechazo, referencia bancaria, monto y notificación automática al cliente."
        phase="Fase 2"
      />
    </AdminShell>
  );
}
