import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, Trash, Plus, X, Loader2 } from "lucide-react";
import { createProduct, updateProduct, uploadProductImage } from "@/lib/products.functions";
import { listBrands, listCategories } from "@/lib/catalog.functions";
import { toast } from "sonner";
import VariantTable, { type Variant } from "./VariantTable";

type Props = {
  product?: any | null;
  onClose?: () => void;
  open?: boolean;
  onSaved?: (id: string) => void;
};

export default function ProductForm({ product = null, onClose, open: openProp, onSaved }: Props) {
  const isEdit = Boolean(product?.id);
  const [open, setOpen] = useState(openProp ?? false);
  useEffect(() => setOpen(openProp ?? false), [openProp]);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [baseSku, setBaseSku] = useState(product?.base_sku ?? "");
  const [brandId, setBrandId] = useState(product?.brand?.id ?? "");
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [cost, setCost] = useState(product?.cost ?? 0);
  const [retailPrice, setRetailPrice] = useState(product?.retail_price ?? 0);
  const [wholesalePrice, setWholesalePrice] = useState<number | null>(
    product?.wholesale_price ?? null,
  );
  const [wholesaleMinQty, setWholesaleMinQty] = useState(product?.wholesale_min_qty ?? 8);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.low_stock_threshold ?? 5);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [isFeatured, setIsFeatured] = useState(Boolean(product?.is_featured));
  const [isBestseller, setIsBestseller] = useState(Boolean(product?.is_bestseller));
  const [isNew, setIsNew] = useState(Boolean(product?.is_new));
  const [isOffer, setIsOffer] = useState(Boolean(product?.is_offer));
  const [active, setActive] = useState(
    product?.active !== undefined ? Boolean(product.active) : true,
  );

  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: brands = [] } = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: () => listBrands(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: () => listCategories(),
  });

  useEffect(() => {
    if (product) {
      setName(product.name ?? "");
      setSlug(product.slug ?? "");
      setBaseSku(product.base_sku ?? "");
      setBrandId(product.brand?.id ?? product.brand_id ?? "");
      setCategoryId(product.category?.id ?? product.category_id ?? "");
      setDescription(product.description ?? "");
      setCost(product.cost ?? 0);
      setRetailPrice(product.retail_price ?? 0);
      setWholesalePrice(product.wholesale_price ?? null);
      setWholesaleMinQty(product.wholesale_min_qty ?? 8);
      setLowStockThreshold(product.low_stock_threshold ?? 5);
      setImages(Array.isArray(product.images) ? product.images : []);
      setIsFeatured(Boolean(product.is_featured));
      setIsBestseller(Boolean(product.is_bestseller));
      setIsNew(Boolean(product.is_new));
      setIsOffer(Boolean(product.is_offer));
      setActive(product.active !== undefined ? Boolean(product.active) : true);

      const existingVariants: Variant[] = Array.isArray(product.variants)
        ? product.variants.map((v: any) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            sku: v.sku,
            stock: v.stock,
            active: v.active !== undefined ? v.active : true,
          }))
        : [];
      setVariants(existingVariants);

      const distinctSizes = Array.from(
        new Set(existingVariants.map((v) => v.size).filter(Boolean)),
      );
      const distinctColors = Array.from(
        new Set(existingVariants.map((v) => v.color).filter((c): c is string => Boolean(c))),
      );
      setSizes(distinctSizes);
      setColors(distinctColors);
    } else {
      setName("");
      setSlug("");
      setBaseSku("");
      setBrandId("");
      setCategoryId("");
      setDescription("");
      setCost(0);
      setRetailPrice(0);
      setWholesalePrice(null);
      setWholesaleMinQty(8);
      setLowStockThreshold(5);
      setImages([]);
      setIsFeatured(false);
      setIsBestseller(false);
      setIsNew(true);
      setIsOffer(false);
      setActive(true);
      setSizes(["S", "M", "L", "XL"]);
      setColors([]);
      setVariants([
        { size: "S", color: null, sku: null, stock: 0, active: true },
        { size: "M", color: null, sku: null, stock: 0, active: true },
        { size: "L", color: null, sku: null, stock: 0, active: true },
        { size: "XL", color: null, sku: null, stock: 0, active: true },
      ]);
    }
  }, [product]);

  function syncCombinations(newSizes: string[], newColors: string[]) {
    const cleanSizes = newSizes.map((s) => s.trim()).filter(Boolean);
    const cleanColors = newColors.map((c) => c.trim()).filter(Boolean);

    if (cleanSizes.length === 0) {
      return;
    }

    const map = new Map<string, Variant>();
    for (const v of variants) {
      const key = `${v.size.trim().toUpperCase()}||${v.color ? v.color.trim().toUpperCase() : "__NULL__"}`;
      map.set(key, v);
    }

    const nextVariants: Variant[] = [];
    const usedKeys = new Set<string>();

    if (cleanColors.length === 0) {
      for (const s of cleanSizes) {
        const key = `${s.toUpperCase()}||__NULL__`;
        usedKeys.add(key);
        const existing = map.get(key);
        if (existing) {
          nextVariants.push(existing);
        } else {
          nextVariants.push({ size: s, color: null, sku: null, stock: 0, active: true });
        }
      }
    } else {
      for (const s of cleanSizes) {
        for (const c of cleanColors) {
          const key = `${s.toUpperCase()}||${c.toUpperCase()}`;
          usedKeys.add(key);
          const existing = map.get(key);
          if (existing) {
            nextVariants.push(existing);
          } else {
            nextVariants.push({ size: s, color: c, sku: null, stock: 0, active: true });
          }
        }
      }
    }

    // Keep any existing database variant (with ID) so it's not discarded accidentally
    for (const v of variants) {
      const key = `${v.size.trim().toUpperCase()}||${v.color ? v.color.trim().toUpperCase() : "__NULL__"}`;
      if (!usedKeys.has(key) && v.id) {
        nextVariants.push(v);
      }
    }

    setVariants(nextVariants);
  }

  function addSize() {
    const next = [...sizes, ""];
    setSizes(next);
  }
  function removeSize(index: number) {
    const next = sizes.filter((_, i) => i !== index);
    setSizes(next);
    syncCombinations(next, colors);
  }
  function updateSize(index: number, value: string) {
    const next = sizes.map((v, i) => (i === index ? value : v));
    setSizes(next);
  }
  function handleSizeBlur() {
    syncCombinations(sizes, colors);
  }

  function addColor() {
    const next = [...colors, ""];
    setColors(next);
  }
  function removeColor(index: number) {
    const next = colors.filter((_, i) => i !== index);
    setColors(next);
    syncCombinations(sizes, next);
  }
  function updateColor(index: number, value: string) {
    const next = colors.map((v, i) => (i === index ? value : v));
    setColors(next);
  }
  function handleColorBlur() {
    syncCombinations(sizes, colors);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.split(",")[1] || "";
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const dataBase64 = await base64Promise;

        const uploadRes = await uploadProductImage({
          data: {
            productId: product?.id || null,
            fileName: file.name,
            contentType: file.type,
            dataBase64,
          },
        });

        if (uploadRes.url) {
          setImages((prev) => [...prev, uploadRes.url]);
        }
      }
      toast.success("Imagen subida correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al subir imagen: ${err.message || "Error desconocido"}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || null,
        base_sku: baseSku.trim() || null,
        brand_id: brandId || null,
        category_id: categoryId || null,
        description: description.trim() || null,
        cost: Number(cost) || 0,
        retail_price: Number(retailPrice) || 0,
        wholesale_price:
          wholesalePrice !== null && wholesalePrice !== undefined ? Number(wholesalePrice) : null,
        wholesale_min_qty: Number(wholesaleMinQty) || 8,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        images,
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        is_new: isNew,
        is_offer: isOffer,
        active,
        sizes: sizes.map((s) => s.trim()).filter(Boolean),
        colors: colors.map((c) => c.trim()).filter(Boolean),
        variants: variants.map((v) => ({
          id: v.id || null,
          size: v.size.trim(),
          color: v.color?.trim() || null,
          sku: v.sku?.trim() || null,
          stock: Number(v.stock || 0),
          active: v.active !== undefined ? Boolean(v.active) : true,
        })),
      };

      if (isEdit && product?.id) {
        await updateProduct({ data: { id: product.id, ...payload } });
        toast.success("Producto actualizado correctamente");
        if (onSaved) onSaved(product.id);
      } else {
        const result = await createProduct({ data: payload });
        toast.success("Producto creado exitosamente");
        if (onSaved) onSaved(result.id);
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setOpen(false);
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al guardar: ${err.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v && onClose) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Producto" : "Crear Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            Configura los datos del producto, precios, tallas, colores, stock y subida de imágenes a
            Supabase Storage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Nombre y SKU */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="prod-name">Nombre del producto *</Label>
              <Input
                id="prod-name"
                value={name}
                placeholder="Ej. Camiseta Real Madrid 2024"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prod-sku">SKU Base</Label>
              <Input
                id="prod-sku"
                value={baseSku}
                placeholder="Ej. RM-2024-HOME"
                onChange={(e) => setBaseSku(e.target.value)}
              />
            </div>
          </div>

          {/* Marca y Categoría */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Marca</Label>
              <Select
                value={brandId || "none"}
                onValueChange={(v) => setBrandId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="prod-desc">Descripción</Label>
            <Textarea
              id="prod-desc"
              rows={3}
              value={description}
              placeholder="Detalles sobre el material, corte y tecnología..."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Precios y Costo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="prod-cost">Costo ($ USD)</Label>
              <Input
                id="prod-cost"
                type="number"
                step="0.01"
                min="0"
                value={String(cost)}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="prod-retail">Precio Detal ($ USD) *</Label>
              <Input
                id="prod-retail"
                type="number"
                step="0.01"
                min="0"
                value={String(retailPrice)}
                onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="prod-wholesale">Precio Mayor ($ USD)</Label>
              <Input
                id="prod-wholesale"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                value={wholesalePrice !== null ? String(wholesalePrice) : ""}
                onChange={(e) =>
                  setWholesalePrice(e.target.value ? parseFloat(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label htmlFor="prod-min-qty">Min. Mayorista</Label>
              <Input
                id="prod-min-qty"
                type="number"
                min="1"
                value={String(wholesaleMinQty)}
                onChange={(e) => setWholesaleMinQty(parseInt(e.target.value, 10) || 8)}
              />
            </div>
          </div>

          {/* Umbral de alerta de stock */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="prod-low-stock">Alerta Stock Bajo (unidades)</Label>
              <Input
                id="prod-low-stock"
                type="number"
                min="0"
                value={String(lowStockThreshold)}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="prod-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="prod-active" className="cursor-pointer font-semibold">
                Producto Activo en Tienda
              </Label>
            </div>
          </div>

          {/* Badges / Destacados */}
          <div className="rounded-lg border border-border p-3">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Etiquetas del Producto
            </Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={isNew} onCheckedChange={setIsNew} />
                <span>Nuevo</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                <span>Destacado</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={isBestseller} onCheckedChange={setIsBestseller} />
                <span>Más Vendido</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={isOffer} onCheckedChange={setIsOffer} />
                <span>En Oferta</span>
              </label>
            </div>
          </div>

          {/* Galería de Imágenes */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Imágenes del Producto (Supabase Storage)
              </Label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-3">
                {uploadingImage ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Subiendo...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" /> Subir Fotos
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>

            {images.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No hay imágenes subidas. Sube fotos en formato JPG, PNG o WebP.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative size-20 overflow-hidden rounded-lg border border-border bg-surface-2"
                  >
                    <img src={img} alt={`Imagen ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generador de Tallas y Colores */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tallas
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={addSize}
                  className="h-7 text-xs"
                >
                  <Plus className="size-3.5" /> Agregar
                </Button>
              </div>
              <div className="mt-2 space-y-1.5">
                {sizes.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      className="h-8 text-xs font-semibold"
                      placeholder="S, M, L, 38, 40..."
                      value={s}
                      onChange={(e) => updateSize(i, e.target.value)}
                      onBlur={handleSizeBlur}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="size-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSize(i)}
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Colores (Opcional)
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={addColor}
                  className="h-7 text-xs"
                >
                  <Plus className="size-3.5" /> Agregar
                </Button>
              </div>
              <div className="mt-2 space-y-1.5">
                {colors.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Sin colores específicos (solo tallas).
                  </p>
                ) : (
                  colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Negro, Blanco, Rojo..."
                        value={c}
                        onChange={(e) => updateColor(i, e.target.value)}
                        onBlur={handleColorBlur}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeColor(i)}
                      >
                        <Trash className="size-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabla de Variantes */}
          <div>
            <VariantTable variants={variants} onChange={setVariants} baseSku={baseSku} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            type="button"
            disabled={saving}
            onClick={() => {
              setOpen(false);
              if (onClose) onClose();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="hero"
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingImage}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Guardando...
              </>
            ) : isEdit ? (
              "Guardar Cambios"
            ) : (
              "Crear Producto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
