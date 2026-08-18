import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo } from "react";

import { ProductCard } from "@/components/site/ProductCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listBrands, listCategories, listProducts } from "@/lib/catalog.functions";
import { totalStock } from "@/lib/types";

type Search = {
  q?: string | undefined;
  categoria?: string | undefined;
  marca?: string | undefined;
  talla?: string | undefined;
  max?: number | undefined;
  orden?: string | undefined;
};

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
    categoria: typeof search["categoria"] === "string" ? (search["categoria"] as string) : undefined,
    marca: typeof search["marca"] === "string" ? (search["marca"] as string) : undefined,
    talla: typeof search["talla"] === "string" ? (search["talla"] as string) : undefined,
    max: search["max"] ? Number(search["max"]) : undefined,
    orden: typeof search["orden"] === "string" ? (search["orden"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo KICKPOINT | Fútbol, gym y marcas premium" },
      {
        name: "description",
        content:
          "Explora todo el catálogo KICKPOINT: franelas de fútbol, leggins, tops, conjuntos y marcas como Alo y On. Filtra por categoría, marca, talla y precio.",
      },
      { property: "og:title", content: "Catálogo KICKPOINT" },
      {
        property: "og:description",
        content: "Todo el catálogo de ropa deportiva KICKPOINT al mayor y al detal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogo,
});

const ORDERS = [
  { value: "nuevos", label: "Nuevos" },
  { value: "precio_asc", label: "Precio ↑" },
  { value: "precio_desc", label: "Precio ↓" },
  { value: "vendidos", label: "Más vendidos" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Catalogo() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: () => listBrands() });

  const sizes = useMemo(() => {
    const set = new Set<string>();
    products?.forEach((p) => p.variants.forEach((v) => set.add(v.size)));
    return Array.from(set);
  }, [products]);

  const categorySlugs = useMemo(() => {
    if (!search.categoria || !categories) return null;
    const match = categories.find((c) => c.slug === search.categoria);
    if (!match) return [search.categoria];
    const children = categories.filter((c) => c.parent_id === match.id).map((c) => c.slug);
    return [match.slug, ...children];
  }, [search.categoria, categories]);

  const filtered = useMemo(() => {
    let list = [...(products ?? [])];
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand?.name ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (categorySlugs) list = list.filter((p) => p.category && categorySlugs.includes(p.category.slug));
    if (search.marca) list = list.filter((p) => p.brand?.slug === search.marca);
    if (search.talla)
      list = list.filter((p) => p.variants.some((v) => v.size === search.talla && v.stock > 0));
    if (search.max) list = list.filter((p) => Number(p.retail_price) <= Number(search.max));

    switch (search.orden) {
      case "precio_asc":
        list.sort((a, b) => Number(a.retail_price) - Number(b.retail_price));
        break;
      case "precio_desc":
        list.sort((a, b) => Number(b.retail_price) - Number(a.retail_price));
        break;
      case "vendidos":
        list.sort((a, b) => Number(b.is_bestseller) - Number(a.is_bestseller));
        break;
      default:
        list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
    return list;
  }, [products, search, categorySlugs]);

  const hasFilters = Boolean(
    search.q || search.categoria || search.marca || search.talla || search.max || search.orden,
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-eyebrow text-primary">Catálogo</p>
            <h1 className="text-display text-3xl sm:text-4xl">Todos los productos</h1>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.q ?? ""}
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              placeholder="Buscar producto o marca..."
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3 border-y border-border py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            <span className="text-eyebrow text-[0.65rem]">Categorías</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(categories ?? [])
              .filter((c) => !c.parent_id)
              .map((c) => (
                <Chip
                  key={c.id}
                  active={search.categoria === c.slug}
                  onClick={() =>
                    setSearch({ categoria: search.categoria === c.slug ? undefined : c.slug })
                  }
                >
                  {c.name}
                </Chip>
              ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(brands ?? []).map((b) => (
              <Chip
                key={b.id}
                active={search.marca === b.slug}
                onClick={() => setSearch({ marca: search.marca === b.slug ? undefined : b.slug })}
              >
                {b.name}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {sizes.map((s) => (
              <Chip
                key={s}
                active={search.talla === s}
                onClick={() => setSearch({ talla: search.talla === s ? undefined : s })}
              >
                {s}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {ORDERS.map((o) => (
                <Chip
                  key={o.value}
                  active={search.orden === o.value}
                  onClick={() => setSearch({ orden: search.orden === o.value ? undefined : o.value })}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({
                    search: {},
                  })
                }
              >
                <X className="size-4" /> Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          {isLoading ? "Cargando productos..." : `${filtered.length} producto(s) encontrados`}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          {!isLoading &&
            filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="surface-card mt-6 p-10 text-center">
            <p className="text-display text-xl">Sin resultados</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Prueba con otra búsqueda o quita algunos filtros.
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="mt-6 text-xs text-muted-foreground">
            Stock total disponible:{" "}
            {filtered.reduce((sum, p) => sum + totalStock(p), 0).toLocaleString()} unidades
          </p>
        )}
      </div>
    </SiteLayout>
  );
}
