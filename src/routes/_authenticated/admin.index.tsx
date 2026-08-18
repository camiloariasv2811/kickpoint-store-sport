import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState, StatCard } from "@/components/admin/StatCard";
import { moneyExact } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type Row = {
  id: string;
  name: string;
  cost: number;
  retail_price: number;
  low_stock_threshold: number;
  category: { name: string } | null;
  variants: { id: string; size: string; color: string | null; stock: number }[];
};

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inventory-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, cost, retail_price, low_stock_threshold, category:categories(name), variants:product_variants(id, size, color, stock)",
        );
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  });

  const products = data ?? [];
  const units = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.stock, 0),
    0,
  );
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.stock, 0) * Number(p.cost),
    0,
  );
  const retailValue = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.stock, 0) * Number(p.retail_price),
    0,
  );
  const lowStock = products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock > 0 && v.stock <= p.low_stock_threshold)
      .map((v) => ({ name: `${p.name} ${v.size}`, stock: v.stock })),
  );
  const soldOut = products.flatMap((p) => p.variants.filter((v) => v.stock <= 0));

  const stockByCategory = Object.values(
    products.reduce<Record<string, { name: string; value: number }>>((acc, p) => {
      const key = p.category?.name ?? "Sin categoría";
      const value = p.variants.reduce((s, v) => s + v.stock, 0);
      acc[key] = { name: key, value: (acc[key]?.value ?? 0) + value };
      return acc;
    }, {}),
  );

  const stockByProduct = products
    .map((p) => ({ name: p.name.slice(0, 14), stock: p.variants.reduce((s, v) => s + v.stock, 0) }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6);

  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Resumen general de KICKPOINT">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={moneyExact(0)}
          hint="Se activa con la Fase 3"
          icon={DollarSign}
        />
        <StatCard
          label="Ventas del mes"
          value={moneyExact(0)}
          hint="Se activa con la Fase 3"
          icon={TrendingUp}
        />
        <StatCard
          label="Productos activos"
          value={isLoading ? "—" : String(products.length)}
          hint={`${units.toLocaleString()} unidades en stock`}
          icon={ShoppingBag}
          tone="primary"
        />
        <StatCard
          label="Valor del inventario"
          value={isLoading ? "—" : moneyExact(inventoryValue)}
          hint={`Valor al detal ${moneyExact(retailValue)}`}
          icon={Boxes}
          tone="primary"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-4 lg:col-span-2">
          <p className="text-eyebrow text-[0.65rem]">Stock por producto</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByProduct}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="stock" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-4">
          <p className="text-eyebrow text-[0.65rem]">Stock por categoría</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {stockByCategory.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <p className="text-eyebrow text-[0.65rem]">Stock bajo</p>
          </div>
          <div className="mt-3 divide-y divide-border">
            {lowStock.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">Todo el stock está en buen nivel.</p>
            )}
            {lowStock.slice(0, 8).map((l) => (
              <div key={l.name} className="flex items-center justify-between py-2.5 text-sm">
                <span>{l.name}</span>
                <span className="font-bold text-warning">{l.stock} unidades</span>
              </div>
            ))}
          </div>
          {soldOut.length > 0 && (
            <p className="mt-3 text-xs text-destructive">
              {soldOut.length} variante(s) agotadas y no disponibles para el cliente.
            </p>
          )}
        </div>

        <EmptyState
          title="Pedidos y ventas"
          description="El checkout, la verificación de pagos, el tracking y el registro de ventas presenciales alimentarán estas métricas. La estructura de base de datos ya está lista."
          phase="Fase 2 y 3"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="size-4 text-primary" /> Datos leídos en tiempo real desde tu base de
        datos.
      </div>
    </AdminShell>
  );
}
