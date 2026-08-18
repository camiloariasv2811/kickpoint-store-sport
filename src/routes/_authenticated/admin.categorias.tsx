import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: AdminCategorias,
});

type Row = { id: string; name: string; slug: string; parent_id: string | null; active: boolean };

function AdminCategorias() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, active")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = data ?? [];
  const roots = rows.filter((r) => !r.parent_id);

  return (
    <AdminShell title="Categorías" subtitle="Categorías y subcategorías del catálogo">
      {isLoading && <Skeleton className="h-56 w-full rounded-xl" />}

      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roots.map((root) => (
            <div key={root.id} className="surface-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-display text-lg">{root.name}</h2>
                <span className="text-xs text-muted-foreground">/{root.slug}</span>
              </div>
              <ul className="mt-3 divide-y divide-border text-sm">
                {rows
                  .filter((r) => r.parent_id === root.id)
                  .map((child) => (
                    <li key={child.id} className="flex items-center justify-between py-2">
                      <span>{child.name}</span>
                      <span className="text-xs text-muted-foreground">/{child.slug}</span>
                    </li>
                  ))}
                {rows.filter((r) => r.parent_id === root.id).length === 0 && (
                  <li className="py-2 text-muted-foreground">Sin subcategorías</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Crear, editar y eliminar categorías se habilita en la Fase 3.
      </p>
    </AdminShell>
  );
}
