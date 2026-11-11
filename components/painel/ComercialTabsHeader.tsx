import Link from "next/link";
import { ArrowUpRight, Layers, TicketPercent } from "lucide-react";

export function ComercialTabsHeader({
  champId,
  active,
}: {
  champId: string;
  active: "lotes" | "cupons";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2">
      <nav aria-label="Comercial do campeonato" className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/painel/campeonatos/${champId}/lotes`}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === "lotes"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <Layers className="size-4" />
          Lotes & Viradas
        </Link>
        <Link
          href={`/painel/campeonatos/${champId}/cupons`}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === "cupons"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <TicketPercent className="size-4" />
          Cupons de Desconto
        </Link>
      </nav>

      <Link
        href={`/painel/campeonatos/${champId}/financeiro`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Ir para Central Financeira
        <ArrowUpRight className="size-3.5" />
      </Link>
    </div>
  );
}
