import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  CheckCircle2,
  FilePenLine,
} from "lucide-react";
import type { LogbookEntry } from "@/components/performance/investments/types";
import { dateLabel, Surface } from "@/components/performance/investments/ui";

const kindConfig = {
  checkin: {
    icon: CheckCircle2,
    className: "bg-emerald-400/10 text-emerald-300",
  },
  contribution: {
    icon: ArrowDownToLine,
    className: "bg-blue-400/10 text-blue-300",
  },
  withdrawal: {
    icon: ArrowUpFromLine,
    className: "bg-amber-400/10 text-amber-200",
  },
  plan: { icon: FilePenLine, className: "bg-violet-400/10 text-violet-300" },
} as const;

export function InvestmentLogbook({ entries }: { entries: LogbookEntry[] }) {
  return (
    <Surface className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/55">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            Diário de bordo
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Decisões e movimentos da rota
          </h2>
          <p className="mt-1 text-sm leading-6 text-white/55">
            Uma linha do tempo do que realmente mudou.
          </p>
        </div>
      </div>
      {!entries.length ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 px-5 py-10 text-center text-sm leading-6 text-white/50">
          Seus check-ins, aportes, retiradas e revisões aparecerão aqui.
        </div>
      ) : (
        <ol className="relative mt-6 space-y-1 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-white/10">
          {entries.map((entry) => {
            const config = kindConfig[entry.kind];
            const Icon = config.icon;
            return (
              <li key={entry.id} className="relative flex gap-3 py-3">
                <span
                  className={`relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border border-[#15191f] ring-4 ring-[#15191f] ${config.className}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs text-white/50">
                    {dateLabel(entry.date)}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-white/80">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    {entry.summary}
                  </p>
                  {entry.details && (
                    <details className="mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold text-blue-300 marker:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        Ver detalhes
                      </summary>
                      <p className="mt-2 rounded-lg bg-[#0f1318] p-3 text-xs leading-5 text-white/55">
                        {entry.details}
                      </p>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Surface>
  );
}
