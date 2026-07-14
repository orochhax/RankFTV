import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Cabeçalho de seção dentro de uma página (ex.: "Campeonatos" acima de um
// grid, com um link "Ver todos" opcional à direita).
export function SectionHeader({
  icon: Icon,
  title,
  actionLabel,
  actionHref,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-blue-600" />}
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {actionLabel} <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
