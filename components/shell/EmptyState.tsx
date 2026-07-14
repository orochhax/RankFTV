import Link from "next/link";

// Estado vazio padrão — usado sempre que uma listagem/seção não tem dados
// reais pra mostrar (nunca preenchida com conteúdo fictício).
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-card-lg bg-surface-2 px-6 py-12 text-center ring-1 ring-border ${className}`}>
      <Icon className="size-10 text-gray-300" />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
