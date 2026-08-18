import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { unitPrice, useCart } from "@/lib/cart";
import { money, moneyExact } from "@/lib/format";

export function CartSheet({ children }: { children: React.ReactNode }) {
  const { lines, subtotal, savings, setQuantity, removeLine } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-display text-xl">Tu carrito</SheetTitle>
          <SheetDescription className="text-sm">
            {lines.length === 0
              ? "Todavía no has agregado productos."
              : `${lines.length} producto(s) listos para pedir.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {lines.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <ShoppingBag className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Explora el catálogo y arma tu pedido.</p>
              <Button asChild variant="hero">
                <Link to="/catalogo">Ver catálogo</Link>
              </Button>
            </div>
          )}

          {lines.map((line) => (
            <div key={line.variantId} className="surface-card flex gap-3 p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {line.image && (
                  <img
                    src={line.image}
                    alt={line.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.name}</p>
                <p className="text-xs text-muted-foreground">
                  Talla {line.size}
                  {line.color ? ` · ${line.color}` : ""}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <button
                      aria-label="Disminuir"
                      onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      aria-label="Aumentar"
                      onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {moneyExact(unitPrice(line) * line.quantity)}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      {money(unitPrice(line))} c/u
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
              </div>
            </div>
          ))}
        </div>

        {lines.length > 0 && (
          <SheetFooter className="gap-3 border-t border-border px-5 py-4">
            <div className="w-full space-y-1 text-sm">
              {savings > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Descuento al mayor</span>
                  <span>-{moneyExact(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span>Subtotal</span>
                <span className="text-primary">{moneyExact(subtotal)}</span>
              </div>
            </div>
            <Button asChild variant="hero" size="lg" className="w-full">
              <Link to="/carrito">Continuar compra</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
