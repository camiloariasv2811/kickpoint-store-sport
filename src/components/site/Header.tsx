import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingCart, Truck, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { CartSheet } from "./CartSheet";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/categorias", label: "Categorías" },
  { to: "/mayor", label: "Compra al mayor" },
] as const;

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="hidden border-b border-border bg-surface/60 py-1.5 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Truck className="size-3.5 text-primary" /> Envíos a todo el país
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-primary" /> Compra 100% segura
          </span>
          <span className="flex items-center gap-2">Al mayor y al detal</span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menú">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <div className="border-b border-border px-5 py-5">
              <Logo />
            </div>
            <nav className="flex flex-col p-3">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeProps={{ className: "text-primary" }}
                  className="rounded-lg px-3 py-3 text-base font-semibold transition-colors hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/pedido"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold transition-colors hover:bg-surface"
              >
                Mis pedidos
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo />

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-eyebrow text-[0.7rem] text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/pedido"
            activeProps={{ className: "text-primary" }}
            className="rounded-md px-3 py-2 text-eyebrow text-[0.7rem] text-foreground/80 transition-colors hover:text-primary"
          >
            Mis pedidos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Buscar">
            <Link to="/catalogo">
              <Search className="size-5" />
            </Link>
          </Button>
          <CartSheet>
            <Button variant="ghost" size="icon" className="relative" aria-label="Carrito">
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          </CartSheet>
        </div>
      </div>
    </header>
  );
}
