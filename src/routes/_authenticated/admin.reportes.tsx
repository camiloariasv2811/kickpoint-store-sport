import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/reportes")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Reportes" subtitle="Rendimiento del negocio">
      <EmptyState
        title="Reportes y exportaciones"
        description="Reportes por rango de fechas: ventas, utilidad, productos más vendidos, rotación de inventario y exportación a CSV."
        phase="Fase 3"
      />
    </AdminShell>
  );
}
