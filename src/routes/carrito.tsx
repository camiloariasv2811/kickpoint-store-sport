import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { unitPrice, useCart } from "@/lib/cart";
import { money, moneyExact } from "@/lib/format";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu carrito | KICKPOINT" },
      {
        name: "description",
        content: "Revisa los productos de tu pedido KICKPOINT antes de continuar la compra.",
      },
      { property: "og:title", content: "Tu carrito | KICKPOINT" },
      { property: "og:description", content: "Revisa tu pedido KICKPOINT y continúa la compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, savings, setQuantity, removeLine } = useCart();

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-eyebrow text-primary">Paso 1 de 4</p>
        <h1 className="text-display text-3xl sm:text-4xl">Tu carrito</h1>

        {lines.length === 0 ? (
          <div className="surface-card mt-8 flex flex-col items-center gap-4 p-14 text-center">
            <ShoppingBag className="size-12 text-muted-foreground" />
            <h2 className="text-display text-2xl">Tu carrito está vacío</h2>
            <p className="text-sm text-muted-foreground">
              Explora el catálogo y agrega tus productos favoritos.
            </p>
            <Button asChild variant="hero" size="lg">
              <Link to="/catalogo">Ver catálogo</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.variantId} className="surface-card flex gap-4 p-4">
                  <Link
                    to="/producto/$slug"
                    params={{ slug: line.slug }}
                    className="size-24 shrink-0 overflow-hidden rounded-lg bg-surface-2"
                  >
                    {line.image && (
                      <img
                        src={line.image}
                        alt={line.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/producto/$slug"
                          params={{ slug: line.slug }}
                          className="font-semibold hover:text-primary"
                        >
                          {line.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Talla {line.size}
                          {line.color ? ` · ${line.color}` : ""}
                        </p>
                      </div>
                      <button
                        aria-label="Eliminar"
                        onClick={() => removeLine(line.variantId)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          aria-label="Disminuir"
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                          className="flex size-10 items-center justify-center text-muted-foreground hover:text-primary"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center font-bold">{line.quantity}</span>
                        <button
                          aria-label="Aumentar"
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          className="flex size-10 items-center justify-center text-muted-foreground hover:text-primary"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {money(unitPrice(line))} c/u
                          {line.wholesalePrice && line.quantity >= line.wholesaleMinQty
                            ? " · precio al mayor"
                            : ""}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {moneyExact(unitPrice(line) * line.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="surface-card h-fit p-5 lg:sticky lg:top-24">
              <h2 className="text-display text-xl">Resumen</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Productos</span>
                  <span>{lines.reduce((s, l) => s + l.quantity, 0)} unidades</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Descuento por cantidad</span>
                    <span>-{moneyExact(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{moneyExact(subtotal)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El envío se calcula en el checkout según tu ciudad.
                </p>
              </div>
              <Button asChild variant="hero" size="xl" className="mt-5 w-full">
                <Link to="/checkout">
                  Continuar compra <ArrowRight className="size-5" />
                </Link>
              </Button>
              <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
                Pago Móvil, USDT o CEL con verificación de comprobante.
              </p>

              <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
                <Link to="/catalogo">Seguir comprando</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
