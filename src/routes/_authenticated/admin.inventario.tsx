import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/inventario")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Inventario" subtitle="Entradas, salidas y ajustes de stock">
      <EmptyState
        title="Control de inventario"
        description="Movimientos de inventario por variante, alertas de stock bajo, ajustes manuales con motivo y descuento automático al confirmar pedidos y ventas."
        phase="Fase 3"
      />
    </AdminShell>
  );
}
