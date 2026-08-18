import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgePercent, Boxes, Store, Truck, Users, Globe } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/mayor")({
  head: () => ({
    meta: [
      { title: "Compra al mayor | KICKPOINT distribución deportiva" },
      {
        name: "description",
        content:
          "Precios especiales al mayor para revendedores, tiendas deportivas, emprendedores y distribuidores. Desde 8 unidades con stock real y envíos nacionales.",
      },
      { property: "og:title", content: "Compra al mayor con KICKPOINT" },
      {
        property: "og:description",
        content: "Precios de mayorista desde 8 unidades para revendedores y tiendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mayor,
});

const AUDIENCE = [
  { icon: Store, t: "Revendedores", d: "Compra por volumen y revende con margen." },
  { icon: Boxes, t: "Tiendas deportivas", d: "Surte tu tienda con las mejores marcas." },
  { icon: Users, t: "Emprendedores", d: "Empieza tu negocio con poca inversión." },
  { icon: Globe, t: "Tiendas online", d: "Catálogo listo para vender por internet." },
  { icon: Truck, t: "Distribuidores", d: "Volúmenes altos con precios preferenciales." },
];

function Mayor() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-grid">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <p className="text-eyebrow text-primary">Kickpoint Wholesale</p>
          <h1 className="text-display mt-2 max-w-2xl text-4xl sm:text-5xl">
            Compra al mayor y multiplica tu negocio
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Precio de mayorista a partir de 8 unidades por producto. Stock real por talla y color,
            atención directa por WhatsApp y envíos a todo el país.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl">
              <Link to="/catalogo">
                Ver catálogo mayorista <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outlineGlow" size="xl">
              <a
                href={whatsappLink("Hola KICKPOINT, quiero comprar al mayor.")}
                target="_blank"
                rel="noreferrer"
              >
                Hablar con un asesor
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-display text-2xl sm:text-3xl">¿Con quién trabajamos?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCE.map((a) => (
            <div
              key={a.t}
              className="surface-card p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
            >
              <a.icon className="size-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{a.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="surface-card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <BadgePercent className="size-8 shrink-0 text-primary" />
            <div>
              <h2 className="text-display text-2xl">Desde 8 unidades pagas precio mayor</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                El descuento se aplica automáticamente en tu carrito.
              </p>
            </div>
          </div>
          <Button asChild variant="hero" size="xl">
            <Link to="/catalogo">Comprar al mayor</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
