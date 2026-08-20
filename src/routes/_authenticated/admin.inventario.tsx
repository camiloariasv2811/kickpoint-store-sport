import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Loader2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/StatCard";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  listInventory,
  listInventoryMovements,
  recordInventoryMovement,
  type InventoryRow,
} from "@/lib/inventory.functions";

export const Route = createFileRoute("/_authenticated/admin/inventario")({
  component: Page,
});

type StatusFilter = "all" | "bajo" | "agotado";
type MovementType = "entrada" | "salida" | "ajuste";

function statusBadge(status: InventoryRow["status"]) {
  if (status === "agotado") return <Badge variant="destructive">Agotado</Badge>;
  if (status === "bajo")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">Stock bajo</Badge>
    );
  return <Badge variant="outline">OK</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MOVEMENT_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  venta: "Venta",
};

function Page() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [movementFor, setMovementFor] = useState<InventoryRow | null>(null);
  const [kardexFor, setKardexFor] = useState<InventoryRow | null>(null);
  const [showKardexGlobal, setShowKardexGlobal] = useState(false);

  const inventoryQuery = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () => listInventory(),
  });

  const rows = (inventoryQuery.data ?? []).filter((r) => {
    const term = q.trim().toLowerCase();
    const matchesQuery =
      !term ||
      r.productName.toLowerCase().includes(term) ||
      (r.sku ?? "").toLowerCase().includes(term) ||
      (r.baseSku ?? "").toLowerCase().includes(term) ||
      r.size.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const lowCount = (inventoryQuery.data ?? []).filter((r) => r.status !== "ok").length;

  return (
    <AdminShell
      title="Inventario"
      subtitle="Stock por variante, entradas, salidas, ajustes y kárdex"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por producto o SKU..."
              className="h-9 w-56 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el stock</SelectItem>
              <SelectItem value="bajo">Solo stock bajo</SelectItem>
              <SelectItem value="agotado">Solo agotados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowKardexGlobal(true)}>
            <History className="size-4" /> Kárdex general
          </Button>
        </div>
      }
    >
      {lowCount > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          <span className="font-semibold text-amber-600">{lowCount}</span> variante(s) con stock
          bajo o agotado.
        </p>
      )}

      {inventoryQuery.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {inventoryQuery.isError && (
        <EmptyState
          title="No pudimos cargar el inventario"
          description="Intenta recargar la página en unos segundos."
        />
      )}

      {!inventoryQuery.isLoading && !inventoryQuery.isError && rows.length === 0 && (
        <EmptyState
          title="Sin resultados"
          description="Ningún producto coincide con la búsqueda o el filtro actual."
        />
      )}

      {!inventoryQuery.isLoading && !inventoryQuery.isError && rows.length > 0 && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Talla / Color</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.variantId} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium">{r.productName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.size}
                    {r.color ? ` · ${r.color}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.sku ?? r.baseSku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.categoryName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.stock}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setKardexFor(r)}>
                        <History className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setMovementFor(r)}>
                        <SlidersHorizontal className="size-3.5" /> Movimiento
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MovementDialog
        row={movementFor}
        onClose={() => setMovementFor(null)}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
          await queryClient.invalidateQueries({ queryKey: ["admin", "pending-orders-count"] });
        }}
      />

      <KardexDialog
        variantId={kardexFor?.variantId ?? null}
        title={kardexFor ? `${kardexFor.productName} · ${kardexFor.size}` : ""}
        open={Boolean(kardexFor)}
        onClose={() => setKardexFor(null)}
      />

      <KardexDialog
        variantId={null}
        title="Kárdex general (últimos 100 movimientos)"
        open={showKardexGlobal}
        onClose={() => setShowKardexGlobal(false)}
      />
    </AdminShell>
  );
}

function MovementDialog({
  row,
  onClose,
  onSaved,
}: {
  row: InventoryRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [type, setType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setType("entrada");
    setQuantity("");
    setReference("");
    setNote("");
  }

  async function save() {
    if (!row) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty)) {
      toast.error(type === "ajuste" ? "Indica el nuevo stock" : "Indica una cantidad válida");
      return;
    }
    setSaving(true);
    try {
      const result = await recordInventoryMovement({
        data: { variantId: row.variantId, type, quantity: qty, reference, note },
      });
      toast.success(`Movimiento registrado. Stock actual: ${result.stockAfter}`);
      reset();
      onClose();
      await onSaved();
    } catch (error) {
      toast.error("No pudimos registrar el movimiento", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(row)}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle>
                {row.productName} · {row.size}
                {row.color ? ` · ${row.color}` : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Stock actual: <span className="font-semibold text-foreground">{row.stock}</span>
              </p>

              <div>
                <Label>Tipo de movimiento</Label>
                <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="size-4 text-emerald-500" /> Entrada
                      </span>
                    </SelectItem>
                    <SelectItem value="salida">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="size-4 text-destructive" /> Salida
                      </span>
                    </SelectItem>
                    <SelectItem value="ajuste">
                      <span className="flex items-center gap-2">
                        <SlidersHorizontal className="size-4" /> Ajuste (fijar stock)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mv-qty">
                  {type === "ajuste" ? "Nuevo stock exacto" : "Cantidad"}
                </Label>
                <Input
                  id="mv-qty"
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={type === "ajuste" ? String(row.stock) : "0"}
                />
              </div>

              <div>
                <Label htmlFor="mv-ref">Referencia (opcional)</Label>
                <Input
                  id="mv-ref"
                  className="mt-1.5"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Factura, guía, # de pedido..."
                />
              </div>

              <div>
                <Label htmlFor="mv-note">Motivo / nota</Label>
                <Textarea
                  id="mv-note"
                  className="mt-1.5"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: reposición de proveedor, conteo físico, mercancía dañada..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={saving} onClick={() => (reset(), onClose())}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={saving} onClick={save}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Registrar movimiento
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KardexDialog({
  variantId,
  title,
  open,
  onClose,
}: {
  variantId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["admin", "inventory-movements", variantId ?? "all"],
    queryFn: () => listInventoryMovements({ data: { variantId: variantId ?? undefined } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {query.isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

        {!query.isLoading && (query.data ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin movimientos registrados todavía.
          </p>
        )}

        {!query.isLoading && (query.data ?? []).length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {(query.data ?? []).map((m) => (
              <li key={m.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {m.productName} · {m.size}
                      {m.color ? ` · ${m.color}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {MOVEMENT_LABELS[m.type] ?? m.type}
                      {m.reference ? ` · ${m.reference}` : ""}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {formatDate(m.createdAt)}
                      {m.createdByEmail ? ` · ${m.createdByEmail}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-semibold ${
                        m.type === "entrada"
                          ? "text-emerald-600"
                          : m.type === "salida"
                            ? "text-destructive"
                            : ""
                      }`}
                    >
                      {m.type === "salida" ? "-" : m.type === "entrada" ? "+" : ""}
                      {Math.abs(m.quantity)}
                    </p>
                    {m.stockAfter !== null && (
                      <p className="text-xs text-muted-foreground">stock: {m.stockAfter}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
