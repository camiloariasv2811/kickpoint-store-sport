import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash } from "lucide-react";

type Variant = {
  id?: string;
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
    onChange([...variants, { size: "", color: null, sku: undefined, stock: 0, active: true }]);
  }

  function remove(idx: number) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Variantes</Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="size-4" /> Añadir variante
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-2">Talla</th>
              <th className="px-2 py-2">Color</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">Stock</th>
              <th className="px-2 py-2">Activo</th>
              <th className="px-2 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {variants.map((v, i) => (
              <tr key={v.id ?? `${v.size}-${v.color}-${i}`} className="align-middle">
                <td className="px-2 py-2 w-40">
                  <Input value={v.size} onChange={(e) => update(i, { size: e.target.value })} />
                </td>
                <td className="px-2 py-2 w-40">
                  <Input value={v.color ?? ""} onChange={(e) => update(i, { color: e.target.value || null })} />
                </td>
                <td className="px-2 py-2 w-56">
                  <Input value={v.sku ?? (baseSku ? `${baseSku}-${(v.size||"").toString().replace(/\s+/g,"")}${v.color?`-${v.color.slice(0,3).toUpperCase()}`:""}` : v.sku ?? "")}
                    onChange={(e) => update(i, { sku: e.target.value })} />
                </td>
                <td className="px-2 py-2 w-28">
                  <Input type="number" value={String(v.stock ?? 0)} onChange={(e) => update(i, { stock: Number(e.target.value || 0) })} />
                </td>
                <td className="px-2 py-2 w-24">
                  <div className="flex items-center">
                    <Checkbox checked={v.active ?? true} onCheckedChange={(val) => update(i, { active: Boolean(val) })} />
                  </div>
                </td>
                <td className="px-2 py-2 w-24">
                  <Button size="sm" variant="ghost" onClick={() => remove(i)}>
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
