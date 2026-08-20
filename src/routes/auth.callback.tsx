import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verificando acceso | KICKPOINT" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanupSubscription: (() => void) | undefined;
    let timer: NodeJS.Timeout | undefined;

    async function processAuth() {
      try {
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error_description") || params.get("error");
        if (error) {
          throw new Error(error);
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (data.session) {
          if (mounted) navigate({ to: "/admin", replace: true });
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session && mounted) {
            subscription.unsubscribe();
            navigate({ to: "/admin", replace: true });
          }
        });
        cleanupSubscription = () => subscription.unsubscribe();

        timer = setTimeout(() => {
          if (mounted) {
            supabase.auth.getSession().then(({ data: fallbackData }) => {
              if (fallbackData.session) {
                navigate({ to: "/admin", replace: true });
              } else {
                navigate({ to: "/auth", replace: true });
              }
            });
          }
        }, 3000);
      } catch (err) {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : "Error al procesar el inicio de sesión";
          setErrorMsg(message);
          timer = setTimeout(() => {
            if (mounted) navigate({ to: "/auth", replace: true });
          }, 2500);
        }
      }
    }

    processAuth();

    return () => {
      mounted = false;
      if (cleanupSubscription) cleanupSubscription();
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grid px-4">
      <div className="surface-card flex max-w-sm flex-col items-center p-8 text-center">
        {errorMsg ? (
          <p className="text-sm text-destructive">{errorMsg}</p>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Completando inicio de sesión...</p>
          </>
        )}
      </div>
    </div>
  );
}
