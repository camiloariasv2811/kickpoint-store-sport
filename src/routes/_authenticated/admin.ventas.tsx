import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/ventas")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Ventas" subtitle="Ventas online y presenciales en un solo lugar">
      <EmptyState
        title="Registro de ventas"
        description="Registro rápido de ventas presenciales, ticket con descuento al mayor, y consolidado de ventas online con márgenes y utilidad por producto."
        phase="Fase 3"
      />
    </AdminShell>
  );
}
