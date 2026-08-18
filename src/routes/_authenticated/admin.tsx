import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { claimAdminIfFirst, getMyRoles } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGuard,
});

function AdminGuard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getMyRoles(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isStaff = (data?.roles ?? []).some((r) => r === "admin" || r === "staff");

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid px-4">
        <div className="surface-card max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-warning" />
          <h1 className="text-display mt-4 text-2xl">Sin permisos administrativos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta no tiene rol de administrador. Si eres el dueño de KICKPOINT y aún no existe
            ningún administrador, puedes reclamar el acceso ahora.
          </p>
          <Button
            variant="hero"
            size="lg"
            className="mt-5 w-full"
            onClick={async () => {
              try {
                const result = await claimAdminIfFirst();
                if (result.granted) {
                  toast.success("Ahora eres administrador");
                  await refetch();
                } else {
                  toast.error("Ya existe un administrador", {
                    description: "Pídele que te asigne un rol.",
                  });
                }
              } catch {
                toast.error("No pudimos asignar el rol");
              }
            }}
          >
            Reclamar acceso de administrador
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
