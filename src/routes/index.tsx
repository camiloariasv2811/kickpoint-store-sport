import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Medal, Sparkles, Store, Truck, Users } from "lucide-react";

import heroAsset from "@/assets/hero-kickpoint.jpg.asset.json";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories, listProducts } from "@/lib/catalog.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KICKPOINT | Ropa deportiva al mayor y al detal" },
      {
        name: "description",
        content:
          "Franelas de fútbol, ropa de gym y marcas premium. Compra al detal o al mayor con envíos a todo el país. Viste tu pasión con KICKPOINT.",
      },
      { property: "og:title", content: "KICKPOINT | Viste tu pasión" },
      {
        property: "og:description",
        content: "Ropa deportiva premium al mayor y al detal. Fútbol, gym y marcas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const CATEGORY_TILES = [
  { slug: "futbol", label: "Fútbol", icon: Medal },
  { slug: "gym", label: "GYM", icon: Flame },
  { slug: "alo", label: "Alo", icon: Sparkles, brand: true },
  { slug: "on", label: "On", icon: Sparkles, brand: true },
] as const;

function SectionHeader({
  title,
  eyebrow,
  to,
}: {
  title: string;
  eyebrow?: string;
  to?: { search?: Record<string, string> };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-eyebrow text-primary">{eyebrow}</p>}
        <h2 className="text-display text-2xl sm:text-3xl">{title}</h2>
      </div>
      <Link
        to="/catalogo"
        search={to?.search}
        className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
      >
        Ver todos <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function ProductRow({ products, loading }: { products: ReturnType<typeof useProducts>["data"]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }
  if (!products?.length) {
    return <p className="text-sm text-muted-foreground">Pronto agregaremos productos aquí.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {products.slice(0, 4).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
}

function Home() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const featured = products?.filter((p) => p.is_featured) ?? [];
  const bestsellers = products?.filter((p) => p.is_bestseller) ?? [];
  const newest = products?.filter((p) => p.is_new) ?? [];
  const roots = (categories ?? []).filter((c) => !c.parent_id);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroAsset.url}
          alt="Atleta con franela deportiva KICKPOINT en estadio"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-32">
          <p className="text-eyebrow text-primary">Ropa deportiva · Al mayor y al detal</p>
          <h1 className="text-display mt-3 max-w-2xl text-5xl sm:text-6xl lg:text-7xl">
            Tu estilo.
            <br />
            Tu equipo.
            <br />
            <span className="text-primary">Tu Kickpoint.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
            Franelas de fútbol, ropa de gym y marcas premium. Los mejores equipos, la mejor calidad.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl">
              <Link to="/catalogo">
                Ver catálogo <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outlineGlow" size="xl">
              <Link to="/mayor">Comprar al mayor</Link>
            </Button>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Medal, t: "Calidad", d: "Productos premium" },
              { icon: Users, t: "Confianza", d: "Miles de clientes" },
              { icon: Truck, t: "Rápido", d: "Envíos seguros" },
            ].map((i) => (
              <div
                key={i.t}
                className="surface-card flex items-center gap-3 bg-background/70 px-4 py-3 backdrop-blur"
              >
                <i.icon className="size-5 text-primary" />
                <div>
                  <p className="text-eyebrow text-[0.6rem]">{i.t}</p>
                  <p className="text-xs text-muted-foreground">{i.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeader eyebrow="Explora" title="Categorías" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORY_TILES.map((tile) => (
            <Link
              key={tile.slug}
              to="/catalogo"
              search={tile.brand ? { marca: tile.slug } : { categoria: tile.slug }}
              className="surface-card group flex flex-col items-center gap-3 px-4 py-6 transition-all hover:-translate-y-1 hover:border-primary/60"
            >
              <tile.icon className="size-7 text-primary transition-transform group-hover:scale-110" />
              <span className="text-eyebrow text-[0.7rem]">{tile.label}</span>
            </Link>
          ))}
          <Link
            to="/catalogo"
            search={{ orden: "nuevos" }}
            className="surface-card group flex flex-col items-center gap-3 bg-accent px-4 py-6 transition-all hover:-translate-y-1 hover:border-primary/60"
          >
            <Sparkles className="size-7 text-primary transition-transform group-hover:scale-110" />
            <span className="text-eyebrow text-center text-[0.7rem]">Nuevos productos</span>
          </Link>
        </div>
        {roots.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {roots.map((c) => (
              <Link
                key={c.id}
                to="/catalogo"
                search={{ categoria: c.slug }}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeader eyebrow="Selección Kickpoint" title="Productos destacados" />
        <ProductRow products={featured} loading={isLoading} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeader eyebrow="Los favoritos" title="Más vendidos" />
        <ProductRow products={bestsellers} loading={isLoading} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeader eyebrow="Recién llegados" title="Nuevos productos" />
        <ProductRow products={newest} loading={isLoading} />
      </section>

      {/* WHOLESALE */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="surface-card bg-grid relative overflow-hidden p-8 sm:p-12">
          <div className="relative max-w-2xl">
            <p className="text-eyebrow text-primary">Kickpoint Wholesale</p>
            <h2 className="text-display mt-2 text-3xl sm:text-4xl">Compra al mayor</h2>
            <p className="mt-4 text-muted-foreground">
              Trabajamos con revendedores, tiendas deportivas, emprendedores, tiendas online y
              distribuidores. Precios especiales a partir de 8 unidades y stock real disponible.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {["Revendedores", "Tiendas deportivas", "Emprendedores", "Tiendas online", "Distribuidores"].map(
                (t) => (
                  <div key={t} className="flex items-center gap-2 text-sm">
                    <Store className="size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{t}</span>
                  </div>
                ),
              )}
            </div>
            <Button asChild variant="hero" size="xl" className="mt-8">
              <Link to="/mayor">
                Comprar al mayor <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
