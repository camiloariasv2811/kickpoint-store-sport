import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createPaymentMethod,
  listAllPaymentMethods,
  updatePaymentMethod,
  type AdminPaymentMethod,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  component: Page,
});

type DetailRow = { key: string; value: string };

type FormState = {
  id: string | null;
  code: string;
  name: string;
  active: boolean;
  instructions: string;
  sort_order: number;
  details: DetailRow[];
};

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  name: "",
  active: true,
  instructions: "",
  sort_order: 0,
  details: [],
};

function toFormState(method: AdminPaymentMethod): FormState {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    active: method.active,
    instructions: method.instructions ?? "",
    sort_order: method.sort_order,
    details: Object.entries(method.details ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  };
}

function detailsToRecord(rows: DetailRow[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    record[key] = row.value.trim();
  }
  return record;
}

function Page() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "payment-methods"],
    queryFn: () => listAllPaymentMethods(),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(method: AdminPaymentMethod) {
    setForm(toFormState(method));
    setOpen(true);
  }

  function updateDetailRow(index: number, patch: Partial<DetailRow>) {
    setForm((prev) => ({
      ...prev,
      details: prev.details.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addDetailRow() {
    setForm((prev) => ({ ...prev, details: [...prev.details, { key: "", value: "" }] }));
  }

  function removeDetailRow(index: number) {
    setForm((prev) => ({ ...prev, details: prev.details.filter((_, i) => i !== index) }));
  }

  async function save() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        active: form.active,
        instructions: form.instructions,
        sort_order: Number(form.sort_order) || 0,
        details: detailsToRecord(form.details),
      };
      if (form.id) {
        await updatePaymentMethod({ data: { id: form.id, ...payload } });
        toast.success("Método de pago actualizado");
      } else {
        await createPaymentMethod({ data: payload });
        toast.success("Método de pago creado");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods"] });
      setOpen(false);
    } catch (error) {
      toast.error("No pudimos guardar el método de pago", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(method: AdminPaymentMethod) {
    try {
      await updatePaymentMethod({
        data: {
          id: method.id,
          code: method.code,
          name: method.name,
          active: !method.active,
          instructions: method.instructions ?? "",
          sort_order: method.sort_order,
          details: method.details,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods"] });
      toast.success(!method.active ? "Método activado" : "Método desactivado");
    } catch (error) {
      toast.error("No pudimos actualizar el estado", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const methods = data ?? [];

  return (
    <AdminShell
      title="Configuración"
      subtitle="Métodos de pago visibles en el checkout"
      actions={
        <Button variant="hero" onClick={openCreate}>
          <Plus className="size-4" /> Nuevo método
        </Button>
      }
    >
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {isError && (
        <EmptyState
          title="No pudimos cargar los métodos de pago"
          description="Intenta recargar la página en unos segundos."
        />
      )}

      {!isLoading && !isError && methods.length === 0 && (
        <EmptyState
          title="Sin métodos de pago"
          description="Crea el primero para que aparezca en el checkout."
        />
      )}

      {!isLoading && !isError && methods.length > 0 && (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Instrucciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="text-muted-foreground">{method.sort_order}</TableCell>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">
                    {method.code}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {method.instructions || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={method.active ? "default" : "outline"}
                      className={method.active ? "bg-accent text-primary" : ""}
                    >
                      {method.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={method.active}
                        onCheckedChange={() => toggleActive(method)}
                        aria-label={method.active ? "Desactivar" : "Activar"}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(method)}>
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar método de pago" : "Nuevo método de pago"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pm-name">Nombre</Label>
                <Input
                  id="pm-name"
                  className="mt-1.5"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Zelle"
                />
              </div>
              <div>
                <Label htmlFor="pm-code">Código</Label>
                <Input
                  id="pm-code"
                  className="mt-1.5"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="zelle"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pm-instructions">Instrucciones para el cliente</Label>
              <Textarea
                id="pm-instructions"
                className="mt-1.5"
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="Enviar el pago a ejemplo@email.com"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="pm-active">Activo</Label>
                <p className="text-xs text-muted-foreground">Visible en el checkout</p>
              </div>
              <Switch
                id="pm-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
            </div>

            <div>
              <Label htmlFor="pm-order">Orden de aparición</Label>
              <Input
                id="pm-order"
                type="number"
                className="mt-1.5 w-24"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Datos de pago</Label>
                <Button size="sm" variant="outline" onClick={addDetailRow}>
                  <Plus className="size-3.5" /> Agregar dato
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {form.details.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={row.key}
                      onChange={(e) => updateDetailRow(i, { key: e.target.value })}
                      placeholder="titular"
                      className="w-1/3"
                    />
                    <Input
                      value={row.value}
                      onChange={(e) => updateDetailRow(i, { value: e.target.value })}
                      placeholder="Kickpoint C.A."
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeDetailRow(i)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {form.details.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ej: banco, titular, teléfono, dirección de wallet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" disabled={saving} onClick={save}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
