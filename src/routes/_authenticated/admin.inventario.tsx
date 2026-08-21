import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Boxes, PackageMinus, PackagePlus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState, StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { moneyExact } from "@/lib/format";
import {
  adjustStock,
  listInventory,
  listMovements,
  type InventoryRow,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/admin/inventario")({
  component: Page,
});

const MOVEMENT_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

function Page() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [target, setTarget] = useState<InventoryRow | null>(null);
  const [type, setType] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const inventory = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () => listInventory(),
  });
  const movements = useQuery({
    queryKey: ["admin", "movements"],
    queryFn: () => listMovements(),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (inventory.data ?? []).filter((r) => {
      const matches =
        !term ||
        r.product_name.toLowerCase().includes(term) ||
        (r.sku ?? "").toLowerCase().includes(term) ||
        r.size.toLowerCase().includes(term);
      const low = r.stock <= r.low_stock_threshold;
      return matches && (!onlyLow || low);
    });
  }, [inventory.data, q, onlyLow]);

  const stats = useMemo(() => {
    const all = inventory.data ?? [];
    return {
      units: all.reduce((sum, r) => sum + r.stock, 0),
      value: all.reduce((sum, r) => sum + r.stock * r.cost, 0),
      low: all.filter((r) => r.stock <= r.low_stock_threshold).length,
      out: all.filter((r) => r.stock === 0).length,
    };
  }, [inventory.data]);

  function openAdjust(row: InventoryRow, nextType: "entrada" | "salida" | "ajuste") {
    setTarget(row);
    setType(nextType);
    setQuantity(nextType === "ajuste" ? String(row.stock) : "1");
    setNote("");
  }

  async function submit() {
    if (!target) return;
    setSaving(true);
    try {
      const result = await adjustStock({
        data: {
          variantId: target.variant_id,
          type,
          quantity: Number(quantity),
          note,
        },
      });
      toast.success(`Stock actualizado a ${result.stock} unidades`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "movements"] }),
      ]);
      setTarget(null);
    } catch (error) {
      toast.error("No pudimos actualizar el stock", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Inventario"
      subtitle="Entradas, salidas y ajustes de stock"
      actions={
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto o talla"
            className="h-9 w-60 pl-9"
          />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unidades en stock" value={String(stats.units)} icon={Boxes} />
        <StatCard
          label="Valor del inventario"
          value={moneyExact(stats.value)}
          hint="Al costo"
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label="Stock bajo"
          value={String(stats.low)}
          hint="Variantes por reponer"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard label="Agotadas" value={String(stats.out)} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={onlyLow ? "hero" : "outline"}
          size="sm"
          onClick={() => setOnlyLow((v) => !v)}
        >
          <AlertTriangle className="size-4" /> Solo stock bajo
        </Button>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto o talla"
          className="h-9 w-full sm:hidden"
        />
      </div>

      {inventory.isLoading && <Skeleton className="mt-4 h-64 w-full rounded-xl" />}

      {!inventory.isLoading && rows.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title="Sin variantes que mostrar"
            description="Ajusta la búsqueda o crea productos con sus tallas para verlos aquí."
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="surface-card mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Talla / Color</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Movimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const low = row.stock <= row.low_stock_threshold;
                return (
                  <TableRow key={row.variant_id}>
                    <TableCell className="font-medium">{row.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.size}
                      {row.color ? ` · ${row.color}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.sku ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={low ? "destructive" : "secondary"}>{row.stock}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {moneyExact(row.stock * row.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Entrada"
                          onClick={() => openAdjust(row, "entrada")}
                        >
                          <PackagePlus className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Salida"
                          onClick={() => openAdjust(row, "salida")}
                        >
                          <PackageMinus className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAdjust(row, "ajuste")}>
                          Ajustar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="text-display mt-8 text-lg">Movimientos recientes</h2>
      {movements.isLoading && <Skeleton className="mt-3 h-40 w-full rounded-xl" />}
      {!movements.isLoading && (movements.data ?? []).length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Aún no hay movimientos registrados.</p>
      )}
      {(movements.data ?? []).length > 0 && (
        <div className="surface-card mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Stock final</TableHead>
                <TableHead>Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("es-VE")}
                  </TableCell>
                  <TableCell>
                    {m.variant?.product?.name ?? "Producto"}
                    <span className="text-muted-foreground">
                      {m.variant?.size ? ` · ${m.variant.size}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.type === "entrada" ? "secondary" : "outline"}>
                      {MOVEMENT_LABELS[m.type] ?? m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell className="text-right">{m.stock_after ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.reference ?? m.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {type === "entrada" ? "Entrada" : type === "salida" ? "Salida" : "Ajuste"} de stock
            </DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {target.product_name} · {target.size}
                {target.color ? ` · ${target.color}` : ""} — stock actual {target.stock}
              </p>
              <div>
                <Label htmlFor="qty">
                  {type === "ajuste" ? "Stock real contado" : "Cantidad"}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="note">Motivo (opcional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Compra a proveedor, devolución, merma..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={submit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
