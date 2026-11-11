import Link from "next/link";
import { AlertTriangle, ExternalLink, Grid2X2, Trophy } from "lucide-react";

export function CompeticaoTabsHeader({
  champId,
  active,
  conflictCount = 0,
}: {
  champId: string;
  active: "chaveamento" | "quadras";
  conflictCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2">
      <nav aria-label="Abas de competição" className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/painel/campeonatos/${champId}/chaveamento`}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === "chaveamento"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <Trophy className="size-4" />
          Chaveamento
        </Link>
        <Link
          href={`/painel/campeonatos/${champId}/quadras`}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === "quadras"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <Grid2X2 className="size-4" />
          Operação por Quadra
          {conflictCount > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                active === "quadras"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <AlertTriangle className="size-3" />
              {conflictCount}
            </span>
          )}
        </Link>
      </nav>

      <a
        href={`/campeonatos/${champId}/ao-vivo`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Placar ao vivo (Telão)
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
