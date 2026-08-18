import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { moneyExact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/productos")({
  component: AdminProductos,
});

type Row = {
  id: string;
  name: string;
  base_sku: string | null;
  retail_price: number;
  wholesale_price: number | null;
  cost: number;
  active: boolean;
  brand: { name: string } | null;
  category: { name: string } | null;
  variants: { id: string; size: string; color: string | null; stock: number }[];
};

function AdminProductos() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, base_sku, retail_price, wholesale_price, cost, active, brand:brands(name), category:categories(name), variants:product_variants(id, size, color, stock)",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = (data ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell
      title="Productos"
      subtitle="Catálogo, precios y stock por variante"
      actions={
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto"
            className="h-9 w-56 pl-9"
          />
        </div>
      }
    >
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Detal</th>
                <th className="px-4 py-3">Mayor</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const stock = r.variants.reduce((s, v) => s + v.stock, 0);
                return (
                  <tr key={r.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.brand?.name ?? "—"} · {r.variants.length} variantes
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.base_sku ?? "—"}</td>
                    <td className="px-4 py-3">{r.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">{moneyExact(r.cost)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {moneyExact(r.retail_price)}
                    </td>
                    <td className="px-4 py-3">
                      {r.wholesale_price ? moneyExact(r.wholesale_price) : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold">{stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          r.active ? "bg-accent text-primary" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        La creación y edición de productos con carga de imágenes llega en la Fase 3, junto con
        inventario y ventas.
      </p>
    </AdminShell>
  );
}
