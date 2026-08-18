import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, ShieldCheck, Truck, RefreshCcw, Medal } from "lucide-react";

import { Logo } from "./Logo";
import { whatsappLink } from "@/lib/format";

const BADGES = [
  { icon: Medal, title: "Calidad premium", text: "Productos de alta calidad" },
  { icon: ShieldCheck, title: "Compra segura", text: "Tus datos protegidos" },
  { icon: MessageCircle, title: "Atención 24/7", text: "Por WhatsApp siempre" },
  { icon: RefreshCcw, title: "Cambios fáciles", text: "Garantía de satisfacción" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
        {BADGES.map((b) => (
          <div key={b.title} className="flex items-start gap-3">
            <b.icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-eyebrow text-[0.65rem]">{b.title}</p>
              <p className="text-sm text-muted-foreground">{b.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Ropa deportiva al mayor y al detal. Fútbol, gym y marcas premium.
            </p>
          </div>
          <div>
            <p className="text-eyebrow mb-3 text-[0.65rem]">Tienda</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/catalogo" className="transition-colors hover:text-primary">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/categorias" className="transition-colors hover:text-primary">
                  Categorías
                </Link>
              </li>
              <li>
                <Link to="/mayor" className="transition-colors hover:text-primary">
                  Compra al mayor
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-eyebrow mb-3 text-[0.65rem]">Ayuda</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/pedido" className="transition-colors hover:text-primary">
                  Consultar mi pedido
                </Link>
              </li>
              <li>
                <a
                  href={whatsappLink("Hola KICKPOINT, necesito ayuda.")}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  Escríbenos por WhatsApp
                </a>
              </li>
              <li>
                <Link to="/auth" className="transition-colors hover:text-primary">
                  Acceso del equipo
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-eyebrow mb-3 text-[0.65rem]">Síguenos</p>
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex size-10 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href={whatsappLink("Hola KICKPOINT!")}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex size-10 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <MessageCircle className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} KICKPOINT. Viste tu pasión.</span>
          <span className="flex items-center gap-2">
            <Truck className="size-3.5 text-primary" /> Envíos nacionales
          </span>
        </div>
      </div>
    </footer>
  );
}
