import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { totalStock, type Product } from "@/lib/types";

function Tag({ children, tone }: { children: string; tone: "primary" | "warning" | "dark" }) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
    dark: "bg-surface-2 text-foreground border border-border",
  } as const;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const stock = totalStock(product);
  const soldOut = stock <= 0;

  return (
    <article className="surface-card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-card">
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-surface-2"
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.is_new && <Tag tone="primary">Nuevo</Tag>}
          {product.is_offer && <Tag tone="warning">Oferta</Tag>}
          {product.is_bestseller && <Tag tone="dark">Más vendido</Tag>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-display text-lg text-destructive">Agotado</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {product.brand?.name ?? "KICKPOINT"}
        </p>
        <h3 className="line-clamp-2 text-base font-semibold leading-tight">{product.name}</h3>

        <div className="mt-auto space-y-1">
          <p className="text-lg font-bold text-primary">{money(product.retail_price)}</p>
          {product.wholesale_price && (
            <p className="text-xs text-muted-foreground">
              Al mayor {money(product.wholesale_price)} · desde {product.wholesale_min_qty} und.
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs">
            <span
              className={`size-2 rounded-full ${soldOut ? "bg-destructive" : "bg-primary"}`}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {soldOut ? "Sin stock" : `Disponible (${stock})`}
            </span>
          </p>
        </div>

        <div className="mt-2 flex gap-2">
          <Button asChild variant="dark" size="sm" className="flex-1 text-[0.7rem]">
            <Link to="/producto/$slug" params={{ slug: product.slug }}>
              Ver producto
            </Link>
          </Button>
          <Button asChild variant="hero" size="sm" aria-label="Ver y agregar">
            <Link to="/producto/$slug" params={{ slug: product.slug }}>
              <ShoppingCart className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
