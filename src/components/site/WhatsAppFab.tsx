import { MessageCircle } from "lucide-react";

import { whatsappLink } from "@/lib/format";

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink("Hola KICKPOINT, necesito ayuda con mi compra.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Ayuda por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
