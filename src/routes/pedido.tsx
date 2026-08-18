import { createFileRoute } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/types";
import { whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/pedido")({
  head: () => ({
    meta: [
      { title: "Consultar mi pedido | KICKPOINT" },
      {
        name: "description",
        content:
          "Consulta el estado y seguimiento de tu pedido KICKPOINT con tu número de pedido (KP-2026-000001).",
      },
      { property: "og:title", content: "Seguimiento de pedidos | KICKPOINT" },
      { property: "og:description", content: "Consulta el estado de tu pedido KICKPOINT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedidoPage,
});

function PedidoPage() {
  const [code, setCode] = useState("");

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-eyebrow text-primary">Seguimiento</p>
        <h1 className="text-display text-3xl sm:text-4xl">Consulta tu pedido</h1>
        <p className="mt-3 text-muted-foreground">
          Ingresa el número que recibiste al confirmar tu compra, por ejemplo KP-2026-000001.
        </p>

        <div className="surface-card mt-6 flex flex-col gap-3 p-5 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KP-2026-000001"
            className="h-12"
          />
          <Button variant="hero" size="lg" disabled={!code}>
            <PackageSearch className="size-5" /> Consultar
          </Button>
        </div>

        <div className="surface-card mt-6 p-5">
          <p className="text-eyebrow text-[0.65rem]">Estados del pedido</p>
          <ol className="mt-4 space-y-4">
            {ORDER_STATUSES.map((status, i) => (
              <li key={status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex size-7 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  {i < ORDER_STATUSES.length - 1 && <span className="h-6 w-px bg-border" />}
                </div>
                <div>
                  <p className="font-semibold">{ORDER_STATUS_LABELS[status]}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            El seguimiento en vivo se activa junto con el checkout y la verificación de pagos (Fase
            2).
          </p>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          ¿Necesitas ayuda?{" "}
          <a
            href={whatsappLink(
              `Hola KICKPOINT, necesito ayuda con mi pedido ${code || "KP-2026-000001"}.`,
            )}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Escríbenos por WhatsApp
          </a>
        </p>
      </div>
    </SiteLayout>
  );
}
