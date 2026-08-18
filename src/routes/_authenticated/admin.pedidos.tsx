import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Pedidos" subtitle="Pedidos online, comprobantes y estados de envío">
      <EmptyState
        title="Gestión de pedidos"
        description="Aquí verás cada pedido con su método de pago, comprobante cargado por el cliente y el avance del tracking (recibido, pago verificado, en preparación, enviado, entregado)."
        phase="Fase 2"
      />
    </AdminShell>
  );
}
