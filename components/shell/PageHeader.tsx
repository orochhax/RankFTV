// Cabeçalho de página do shell desktop: título forte + descrição discreta +
// ações à direita. Substitui o padrão antigo de faixa escura alta seguida de
// folha branca arredondada nas páginas que passam a usar o AppShell.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  theme = "light",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-amber-300" : "text-blue-600"}`}>{eyebrow}</p>
        )}
        <h1 className={`mt-1 text-2xl font-bold tracking-tight lg:text-3xl ${isDark ? "text-white" : "text-ink"}`}>{title}</h1>
        {description && <p className={`mt-1.5 max-w-2xl text-sm ${isDark ? "text-white/60" : "text-ink-muted"}`}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
