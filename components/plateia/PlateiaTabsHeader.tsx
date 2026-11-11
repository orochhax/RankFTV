import Link from "next/link";
import { Armchair, ArrowUpRight, ListChecks, BadgeDollarSign } from "lucide-react";

export function PlateiaTabsHeader({
  champId,
  active,
  temPlateia = true,
}: {
  champId: string;
  active: "tipos" | "lista" | "financeiro";
  temPlateia?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2">
      <nav aria-label="Navegação de espectadores" className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/painel/campeonatos/${champId}/plateia`}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            active === "tipos"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <Armchair className="size-4" />
          Ingressos de Plateia
        </Link>

        {temPlateia ? (
          <Link
            href={`/painel/campeonatos/${champId}/plateia/lista`}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active === "lista"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <ListChecks className="size-4" />
            Lista & Portaria
          </Link>
        ) : (
          <span
            title="Cadastre tipos de ingresso para liberar"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ink-muted/60 opacity-60"
          >
            <ListChecks className="size-4" />
            Lista & Portaria
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px]">Indisponível</span>
          </span>
        )}

        {temPlateia ? (
          <Link
            href={`/painel/campeonatos/${champId}/plateia/financeiro`}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active === "financeiro"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <BadgeDollarSign className="size-4" />
            Financeiro da Plateia
          </Link>
        ) : (
          <span
            title="Cadastre tipos de ingresso para liberar"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ink-muted/60 opacity-60"
          >
            <BadgeDollarSign className="size-4" />
            Financeiro da Plateia
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px]">Indisponível</span>
          </span>
        )}
      </nav>

      <Link
        href={`/painel/campeonatos/${champId}/financeiro`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Ver na Central Financeira
        <ArrowUpRight className="size-3.5" />
      </Link>
    </div>
  );
}
