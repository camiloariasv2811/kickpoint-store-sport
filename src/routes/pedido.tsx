import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, PackageSearch, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderByNumber, listPaymentMethods, uploadPaymentProof } from "@/lib/checkout.functions";
import { moneyExact, whatsappLink } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/pedido")({
  validateSearch: (search: { code?: string }): { code?: string } => ({
    code: typeof search.code === "string" ? search.code.toUpperCase().slice(0, 24) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Consultar mi pedido | KICKPOINT" },
      {
        name: "description",
        content:
          "Consulta el estado y seguimiento de tu pedido KICKPOINT con tu número de pedido (KP-2026-000001) y sube tu comprobante de pago.",
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
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(code ?? "");

  useEffect(() => {
    setInput(code ?? "");
  }, [code]);

  const order = useQuery({
    queryKey: ["public-order", code],
    queryFn: () => getOrderByNumber({ data: { orderNumber: code as string } }),
    enabled: Boolean(code),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-eyebrow text-primary">Seguimiento</p>
        <h1 className="text-display text-3xl sm:text-4xl">Consulta tu pedido</h1>
        <p className="mt-3 text-muted-foreground">
          Ingresa el número que recibiste al confirmar tu compra, por ejemplo KP-2026-000001.
        </p>

        <form
          className="surface-card mt-6 flex flex-col gap-3 p-5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/pedido", search: { code: input.trim().toUpperCase() } });
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="KP-2026-000001"
            className="h-12"
          />
          <Button type="submit" variant="hero" size="lg" disabled={!input.trim()}>
            <PackageSearch className="size-5" /> Consultar
          </Button>
        </form>

        {order.isLoading && (
          <div className="surface-card mt-6 flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Buscando tu pedido…
          </div>
        )}

        {code && !order.isLoading && !order.data && (
          <div className="surface-card mt-6 p-5 text-sm text-muted-foreground">
            No encontramos el pedido <span className="font-semibold text-foreground">{code}</span>.
            Verifica el número o escríbenos por WhatsApp.
          </div>
        )}

        {order.data && (
          <OrderDetail order={order.data} onRefresh={() => void order.refetch()} />
        )}

        {!code && <StatusLegend />}

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

function StatusLegend() {
  return (
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
            <p className="font-semibold">{ORDER_STATUS_LABELS[status]}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

type PublicOrderData = NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>;

function OrderDetail({ order, onRefresh }: { order: PublicOrderData; onRefresh: () => void }) {
  const currentIndex = ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number]);
  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => listPaymentMethods(),
  });
  const method = methods?.find((m) => m.code === order.payment_method_code);

  const fileRef = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      await uploadPaymentProof({
        data: {
          orderNumber: order.order_number,
          reference,
          fileName: file.name,
          contentType: file.type,
          dataBase64: btoa(binary),
        },
      });
      toast.success("Comprobante enviado", { description: "Nuestro equipo lo verificará pronto." });
      onRefresh();
    } catch (error) {
      toast.error("No pudimos subir el comprobante", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-eyebrow text-[0.65rem]">Pedido</p>
            <h2 className="text-display text-2xl">{order.order_number}</h2>
          </div>
          <p className="text-display text-2xl text-primary">{moneyExact(order.total)}</p>
        </div>

        <ol className="mt-6 space-y-4">
          {ORDER_STATUSES.map((status, i) => {
            const done = i <= currentIndex;
            return (
              <li key={status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full border text-xs font-bold ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  {i < ORDER_STATUSES.length - 1 && (
                    <span className={`h-6 w-px ${done ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
                <p className={done ? "font-semibold" : "text-muted-foreground"}>
                  {ORDER_STATUS_LABELS[status]}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="surface-card p-5">
        <h3 className="text-display text-lg">Productos</h3>
        <ul className="mt-3 space-y-3 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.product_name}</span>
                <span className="text-xs text-muted-foreground">
                  Talla {item.size ?? "-"} × {item.quantity}
                </span>
              </span>
              <span className="font-semibold">{moneyExact(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </section>

      {order.payment_status !== "verificado" && (
        <section className="surface-card p-5">
          <h3 className="text-display text-lg">Comprobante de pago</h3>
          {method && (
            <div className="mt-3 rounded-xl border border-border bg-surface-2/50 p-4 text-sm">
              <p className="font-bold">{method.name}</p>
              {method.instructions && (
                <p className="mt-1 text-xs text-muted-foreground">{method.instructions}</p>
              )}
              {Object.entries(method.details ?? {}).map(([key, value]) => (
                <div key={key} className="mt-2 flex justify-between gap-4">
                  <span className="capitalize text-muted-foreground">{key}</span>
                  <span className="text-right font-semibold">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {order.rejection_reason && (
            <p className="mt-3 text-sm text-destructive">
              Comprobante rechazado: {order.rejection_reason}. Sube uno nuevo.
            </p>
          )}
          {order.proof_uploaded && !order.rejection_reason && (
            <p className="mt-3 text-sm text-primary">
              Recibimos tu comprobante, está en verificación.
            </p>
          )}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Referencia o últimos dígitos (opcional)
              </span>
              <Input
                className="mt-1.5 h-11"
                value={reference}
                placeholder="Ej: 004512"
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5" />
              )}
              {order.proof_uploaded ? "Subir otro comprobante" : "Subir comprobante"}
            </Button>
          </div>
        </section>
      )}

      {order.payment_status === "verificado" && (
        <section className="surface-card flex items-center gap-3 p-5">
          <CheckCircle2 className="size-6 text-primary" />
          <p className="text-sm font-semibold">Pago verificado. Estamos preparando tu pedido.</p>
        </section>
      )}
    </div>
  );
}
