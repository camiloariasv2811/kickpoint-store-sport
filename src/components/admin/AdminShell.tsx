import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/ventas", label: "Ventas", icon: BarChart3 },
  { to: "/admin/inventario", label: "Inventario", icon: Boxes },
  { to: "/admin/productos", label: "Productos", icon: ShoppingBag },
  { to: "/admin/categorias", label: "Categorías", icon: Tags },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/reportes", label: "Reportes", icon: FileBarChart },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: Boolean((item as { exact?: boolean }).exact) }}
          activeProps={{
            className: "bg-sidebar-accent text-primary border-primary/40",
          }}
          className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-primary"
        >
          <item.icon className="size-4.5 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo />
          <p className="text-eyebrow mt-1 text-[0.6rem] text-primary">Portal del vendedor</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link to="/">
              <Store className="size-4" /> Ver tienda
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menú administrativo</SheetTitle>
              <div className="border-b border-sidebar-border px-5 py-5">
                <Logo />
              </div>
              <NavList onNavigate={() => setOpen(false)} />
              <div className="border-t border-sidebar-border p-3">
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="size-4" /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <h1 className="text-display truncate text-xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
