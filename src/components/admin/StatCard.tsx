import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning";
}) {
  const tones = {
    default: "text-foreground",
    primary: "text-primary",
    warning: "text-warning",
  } as const;

  return (
    <div className="surface-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-eyebrow text-[0.6rem] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <div className="surface-card flex flex-col items-start gap-2 p-8">
      <h2 className="text-display text-xl">{title}</h2>
      <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      {phase && (
        <span className="mt-2 rounded-md bg-accent px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-primary">
          {phase}
        </span>
      )}
    </div>
  );
}
