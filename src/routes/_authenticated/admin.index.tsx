import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminDashboard, type DashboardMetrics } from "@/lib/dashboard.functions";
import { moneyExact } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pedido_recibido: {
    label: "Recibido",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  pago_pendiente: {
    label: "Pago Pendiente",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  pago_subido: {
    label: "Comprobante Subido",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  pago_verificado: {
    label: "Pago Aprobado",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  preparando_pedido: {
    label: "En Preparación",
    className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
  empacando_pedido: {
    label: "Empacando",
    className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  pedido_enviado: {
    label: "Enviado",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  pedido_entregado: {
    label: "Entregado",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  verificado: {
    label: "Cobrado",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  pendiente: {
    label: "Por verificar",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  sin_pago: {
    label: "Sin pago",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  entrada: {
    label: "Entrada",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  salida: {
    label: "Salida",
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  ajuste: {
    label: "Ajuste",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  venta: {
    label: "Venta",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

const CHART_COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

function Dashboard() {
  const queryClient = useQueryClient();

  const {
    data: metrics,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<DashboardMetrics>({
    queryKey: ["admin", "dashboard-metrics"],
    queryFn: () => getAdminDashboard(),
    refetchInterval: 60000,
  });

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <AdminShell title="Dashboard" subtitle="Centro de control y analítica operativa en tiempo real">
      {/* Botón de Refrescar y Estado */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="size-4 text-primary" />
          <span>Métricas calculadas directamente de Supabase</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });
            refetch();
          }}
          disabled={isFetching}
          className="h-8 gap-2 text-xs"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Actualizando..." : "Actualizar métricas"}
        </Button>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">No se pudieron cargar las métricas del dashboard</p>
          <p className="mt-1 text-xs opacity-90">
            {error instanceof Error ? error.message : "Error de comunicación con el servidor"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3 h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/20"
          >
            Reintentar
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* SECCIÓN 1: FINANZAS Y VENTAS */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ventas y Cobranza
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Ventas de hoy"
                value={moneyExact(metrics.sales.todayTotal)}
                hint={`${metrics.sales.todayCount} venta(s) registradas`}
                icon={DollarSign}
                tone="primary"
              />
              <StatCard
                label="Ventas del mes"
                value={moneyExact(metrics.sales.monthTotal)}
                hint={`${metrics.sales.monthCount} transacciones en el mes`}
                icon={TrendingUp}
                tone="primary"
              />
              <StatCard
                label="Dinero cobrado"
                value={moneyExact(metrics.sales.totalCollected)}
                hint={`Total generado: ${moneyExact(metrics.sales.totalGenerated)}`}
                icon={CheckCircle2}
                tone="default"
              />
              <StatCard
                label="Pagos por verificar"
                value={String(metrics.sales.pendingPaymentsCount)}
                hint={`${moneyExact(metrics.sales.pendingPaymentsAmount)} por confirmar`}
                icon={Clock}
                tone={metrics.sales.pendingPaymentsCount > 0 ? "warning" : "default"}
              />
              <StatCard
                label="Pedidos pendientes"
                value={String(metrics.sales.pendingOrdersCount)}
                hint="En cola operativa"
                icon={Truck}
                tone={metrics.sales.pendingOrdersCount > 0 ? "warning" : "default"}
              />
            </div>
          </div>

          {/* SECCIÓN 2: INVENTARIO */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estado de Inventario
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Unidades en stock"
                value={metrics.inventory.totalUnits.toLocaleString()}
                hint={`${metrics.inventory.activeProductsCount} productos activos`}
                icon={Boxes}
                tone="primary"
              />
              <StatCard
                label="Valor a costo"
                value={moneyExact(metrics.inventory.totalCostValue)}
                hint="Inversión total en almacén"
                icon={ShoppingBag}
                tone="default"
              />
              <StatCard
                label="Valor a detal"
                value={moneyExact(metrics.inventory.totalRetailValue)}
                hint="Potencial de venta total"
                icon={DollarSign}
                tone="default"
              />
              <StatCard
                label="Agotados"
                value={String(metrics.inventory.outOfStockCount)}
                hint="Sin stock disponible"
                icon={AlertOctagon}
                tone={metrics.inventory.outOfStockCount > 0 ? "warning" : "default"}
              />
              <StatCard
                label="Stock bajo"
                value={String(metrics.inventory.lowStockCount)}
                hint="Bajo umbral mínimo"
                icon={AlertTriangle}
                tone={metrics.inventory.lowStockCount > 0 ? "warning" : "default"}
              />
            </div>
          </div>

          {/* SECCIÓN 3: GRÁFICOS */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Gráfico 1: Evolución de Ventas */}
            <Card className="surface-card border-border lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Evolución de Ventas (Últimos 14 días)</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Volumen diario en USD
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.charts.salesEvolution}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                          fontSize: 12,
                        }}
                        formatter={(value) => [moneyExact(Number(value)), "Ventas"]}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#salesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Distribución por Canal */}
            <Card className="surface-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Ventas por Canal</span>
                  <span className="text-xs text-muted-foreground font-normal">Proporción</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {metrics.charts.salesByChannel.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No hay transacciones registradas aún
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.charts.salesByChannel}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {metrics.charts.salesByChannel.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(val) => [moneyExact(Number(val)), "Monto"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {/* Leyenda de Canales */}
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                  {metrics.charts.salesByChannel.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{c.name}:</span>
                      <span className="font-semibold">{moneyExact(c.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 4: TABLAS OPERATIVAS */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tabla 1: Pedidos Recientes */}
            <Card className="surface-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold">Pedidos Recientes</CardTitle>
                <Link
                  to="/admin/pedidos"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs">Pedido</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          No hay pedidos recientes registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.recentOrders.map((o) => {
                        const statusBadge = STATUS_LABELS[o.status] || {
                          label: o.status,
                          className: "bg-muted text-foreground",
                        };
                        const paymentBadge = PAYMENT_STATUS_LABELS[o.paymentStatus] || {
                          label: o.paymentStatus,
                          className: "bg-muted text-muted-foreground",
                        };

                        return (
                          <TableRow key={o.id} className="border-border text-xs">
                            <TableCell className="font-mono font-medium">{o.orderNumber}</TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {o.customerName}
                            </TableCell>
                            <TableCell className="font-semibold">{moneyExact(o.total)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[0.65rem] px-1.5 py-0.5 border ${statusBadge.className}`}
                              >
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[0.65rem] px-1.5 py-0.5 border ${paymentBadge.className}`}
                              >
                                {paymentBadge.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tabla 2: Alertas de Stock Bajo y Agotados */}
            <Card className="surface-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <span>Productos con Stock Crítico</span>
                </CardTitle>
                <Link
                  to="/admin/inventario"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ir a inventario <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs">Producto / Talla</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs text-right">Stock</TableHead>
                      <TableHead className="text-xs text-right">Umbral</TableHead>
                      <TableHead className="text-xs text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-xs text-emerald-500"
                        >
                          Todo el inventario activo se encuentra en niveles óptimos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.lowStockItems.map((item) => (
                        <TableRow key={item.variantId} className="border-border text-xs">
                          <TableCell className="font-medium">
                            <span className="truncate block max-w-[150px]">{item.productName}</span>
                            <span className="text-[0.7rem] text-muted-foreground">
                              Talla: {item.size} {item.color ? `· ${item.color}` : ""}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[0.7rem] text-muted-foreground">
                            {item.sku ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span
                              className={item.stock === 0 ? "text-destructive" : "text-amber-500"}
                            >
                              {item.stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.threshold}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`text-[0.65rem] px-1.5 py-0.5 border ${
                                item.status === "agotado"
                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              {item.status === "agotado" ? "Agotado" : "Stock Bajo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 5: MOVIMIENTOS RECIENTES DE INVENTARIO */}
          <Card className="surface-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">
                Últimos Movimientos de Inventario
              </CardTitle>
              <Link
                to="/admin/inventario"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Historial completo <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Producto / Variante</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                    <TableHead className="text-xs text-right">Stock Resultante</TableHead>
                    <TableHead className="text-xs">Referencia / Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentMovements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-6 text-center text-xs text-muted-foreground"
                      >
                        No hay movimientos de inventario registrados aún.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.recentMovements.map((m) => {
                      const typeBadge = MOVEMENT_TYPE_LABELS[m.type] || {
                        label: m.type,
                        className: "bg-muted text-foreground",
                      };

                      return (
                        <TableRow key={m.id} className="border-border text-xs">
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(m.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span>{m.productName}</span>
                            {(m.size || m.color) && (
                              <span className="text-[0.7rem] text-muted-foreground block">
                                Talla: {m.size ?? "—"} {m.color ? `· ${m.color}` : ""}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[0.65rem] px-1.5 py-0.5 border ${typeBadge.className}`}
                            >
                              {typeBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {m.type === "salida" || m.type === "venta"
                              ? `-${m.quantity}`
                              : `+${m.quantity}`}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono">
                            {m.stockAfter !== null ? m.stockAfter : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {m.reference || m.note || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}
