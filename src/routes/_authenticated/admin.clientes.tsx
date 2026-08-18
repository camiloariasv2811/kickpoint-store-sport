import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Clientes" subtitle="Clientes al detal y mayoristas">
      <EmptyState
        title="Base de clientes"
        description="Ficha de cada cliente con historial de compras, tipo (detal o mayor), datos de contacto y notas internas del equipo."
        phase="Fase 2"
      />
    </AdminShell>
  );
}
