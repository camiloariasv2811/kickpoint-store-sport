import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  component: Page,
});

function Page() {
  return (
    <AdminShell title="Configuración" subtitle="Datos de la tienda y métodos de pago">
      <EmptyState
        title="Configuración de la tienda"
        description="Datos de contacto y WhatsApp, tasa de cambio, mínimos para precio al mayor, métodos de pago activos y usuarios del equipo con sus roles."
        phase="Fase 3"
      />
    </AdminShell>
  );
}
