import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex flex-col leading-none">
      <span className="text-display text-2xl sm:text-[1.7rem]">
        KICK<span className="text-primary">POINT</span>
      </span>
      {!compact && (
        <span className="text-eyebrow text-[0.55rem] text-muted-foreground">Viste tu pasión</span>
      )}
    </Link>
  );
}
