import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories, listProducts } from "@/lib/catalog.functions";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorías | KICKPOINT ropa deportiva" },
      {
        name: "description",
        content:
          "Fútbol, GYM y marcas premium. Descubre todas las categorías y subcategorías de ropa deportiva KICKPOINT.",
      },
      { property: "og:title", content: "Categorías KICKPOINT" },
      {
        property: "og:description",
        content: "Fútbol, GYM y marcas: encuentra tu categoría en KICKPOINT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categorias,
});

function Categorias() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });

  const roots = (categories ?? []).filter((c) => !c.parent_id);
  const countFor = (slugs: string[]) =>
    (products ?? []).filter((p) => p.category && slugs.includes(p.category.slug)).length;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-eyebrow text-primary">Explora</p>
        <h1 className="text-display text-3xl sm:text-4xl">Categorías</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}

          {roots.map((root) => {
            const children = (categories ?? []).filter((c) => c.parent_id === root.id);
            const slugs = [root.slug, ...children.map((c) => c.slug)];
            return (
              <div key={root.id} className="surface-card overflow-hidden">
                <Link
                  to="/catalogo"
                  search={{ categoria: root.slug }}
                  className="flex items-center justify-between gap-2 border-b border-border bg-accent px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div>
                    <h2 className="text-display text-xl">{root.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {countFor(slugs)} producto(s) disponibles
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-primary" />
                </Link>
                <div className="flex flex-col p-2">
                  {children.length === 0 && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      Sin subcategorías todavía.
                    </p>
                  )}
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      to="/catalogo"
                      search={{ categoria: child.slug }}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-primary"
                    >
                      {child.name}
                      <span className="text-xs text-muted-foreground">
                        {countFor([child.slug])}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SiteLayout>
  );
}
