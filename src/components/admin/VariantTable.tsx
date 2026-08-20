import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash } from "lucide-react";

export type Variant = {
  id?: string | null;
  size: string;
  color?: string | null;
  sku?: string | null;
  stock?: number;
  active?: boolean;
};

export default function VariantTable({
  variants,
  onChange,
  baseSku,
}: {
  variants: Variant[];
  onChange: (v: Variant[]) => void;
  baseSku?: string | null;
}) {
  function update(idx: number, patch: Partial<Variant>) {
    const next = variants.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    onChange(next);
  }

  function add() {
    onChange([...variants, { size: "", color: null, sku: null, stock: 0, active: true }]);
  }

  function remove(idx: number) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Variantes (Talla × Color)</Label>
        <Button size="sm" variant="outline" type="button" onClick={add}>
          <Plus className="size-4" /> Añadir variante
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-2.5 py-2">Talla</th>
              <th className="px-2.5 py-2">Color</th>
              <th className="px-2.5 py-2">SKU</th>
              <th className="px-2.5 py-2">Stock</th>
              <th className="px-2.5 py-2">Activo</th>
              <th className="px-2.5 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {variants.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                  No hay variantes definidas. Agrega tallas arriba o usa "Añadir variante".
                </td>
              </tr>
            )}
            {variants.map((v, i) => (
              <tr
                key={v.id ?? `v-${i}-${v.size}-${v.color}`}
                className="align-middle transition-colors hover:bg-surface-2/40"
              >
                <td className="px-2.5 py-1.5 w-32">
                  <Input
                    className="h-8 text-xs font-semibold"
                    placeholder="S, M, L, 40..."
                    value={v.size}
                    onChange={(e) => update(i, { size: e.target.value })}
                  />
                </td>
                <td className="px-2.5 py-1.5 w-32">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Negro, Azul..."
                    value={v.color ?? ""}
                    onChange={(e) => update(i, { color: e.target.value ? e.target.value : null })}
                  />
                </td>
                <td className="px-2.5 py-1.5 w-48">
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder={
                      baseSku
                        ? `${baseSku}-${(v.size || "").replace(/\s+/g, "").toUpperCase()}`
                        : "SKU-VAR"
                    }
                    value={v.sku ?? ""}
                    onChange={(e) => update(i, { sku: e.target.value ? e.target.value : null })}
                  />
                </td>
                <td className="px-2.5 py-1.5 w-24">
                  <Input
                    className="h-8 text-xs text-right font-medium"
                    type="number"
                    min="0"
                    value={String(v.stock ?? 0)}
                    onChange={(e) =>
                      update(i, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                </td>
                <td className="px-2.5 py-1.5 w-16 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={v.active ?? true}
                      onCheckedChange={(val) => update(i, { active: Boolean(val) })}
                    />
                  </div>
                </td>
                <td className="px-2.5 py-1.5 w-16 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    className="size-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(i)}
                    title="Quitar variante"
                  >
                    <Trash className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
