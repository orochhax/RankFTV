import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Surface } from "@/components/shell/Surface";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { CHAMPIONSHIP_NAV_GROUPS } from "@/components/painel/championship-nav-items";

export type ActionBadgeTone = "blue" | "emerald" | "amber" | "rose" | "slate";

export type ActionBadge = {
  text: string;
  tone?: ActionBadgeTone;
};

const BADGE_CLASSES: Record<ActionBadgeTone, string> = {
  blue: "bg-brand-soft text-brand-ink border-brand-border",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-surface-2 text-ink-muted border-border",
};

const GROUP_ACCENTS: Record<string, { dot: string; iconBg: string; iconText: string }> = {
  Atletas: {
    dot: "bg-brand",
    iconBg: "bg-brand-soft",
    iconText: "text-brand",
  },
  Financeiro: {
    dot: "bg-emerald-600",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
  },
  Equipe: {
    dot: "bg-accent",
    iconBg: "bg-accent-soft",
    iconText: "text-accent-ink",
  },
  Espectadores: {
    dot: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
  },
};

// Atalhos de gestão do campeonato — fonte única é CHAMPIONSHIP_NAV_GROUPS
// (mesmos hrefs do menu "Gerenciar" do shell), só reorganizados visualmente:
// "Editar campeonato" migra do grupo "Principal" pra junto de "Atletas", e
// "Visão geral" nunca aparece aqui (a página que renderiza isso já É a
// visão geral).
export function ChampionshipActions({
  champId,
  temPlateia = true,
  badges = {},
}: {
  champId: string;
  temPlateia?: boolean;
  badges?: Partial<Record<string, ActionBadge>>;
}) {
  const principal = CHAMPIONSHIP_NAV_GROUPS.find((g) => g.label === "Principal");
  const editarItem = principal?.items.find((i) => i.key === "editar");

  const grupos = CHAMPIONSHIP_NAV_GROUPS
    .filter((g) => g.label !== "Principal")
    .map((g) =>
      g.label === "Atletas" && editarItem ? { ...g, items: [editarItem, ...g.items] } : g,
    );

  return (
    <section>
      <SectionHeader title="Gerenciar campeonato" />
      <p className="mt-1 text-xs text-ink-muted">
        Acesse cada módulo operacional sem perder o contexto do torneio.
      </p>
      <Surface padding="md" className="mt-3 space-y-6">
        {grupos.map((group) => {
          const accent = GROUP_ACCENTS[group.label] ?? GROUP_ACCENTS.Atletas;
          return (
            <div key={group.label}>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${accent.dot}`} />
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {group.label}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-ink-muted">
                  {group.items.length} {group.items.length === 1 ? "módulo" : "módulos"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isDisabled = group.label === "Espectadores" && !temPlateia && item.key !== "plateia";
                  const badge = badges[item.key];
                  const isFinanceHub = item.key === "financeiro";

                  if (isDisabled) {
                    return (
                      <div
                        key={item.key}
                        title="Cadastre tipos de ingresso de plateia para liberar esta seção"
                        className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3 text-sm text-ink-muted opacity-65 cursor-not-allowed select-none"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
                          <Icon className="size-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-ink-muted">
                              {item.label}
                            </span>
                            <span className="shrink-0 rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                              Indisponível
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted/80">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      href={item.href(champId)}
                      className={`group flex items-start gap-3 rounded-xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        isFinanceHub
                          ? "border-emerald-200/80 bg-surface hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm"
                          : "border-border bg-surface hover:border-brand-border hover:bg-brand-soft/40 hover:shadow-sm"
                      }`}
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${accent.iconBg} ${accent.iconText}`}
                      >
                        <Icon className="size-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink group-hover:text-brand-ink">
                            {item.label}
                          </span>
                          {badge ? (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                BADGE_CLASSES[badge.tone ?? "blue"]
                              }`}
                            >
                              {badge.text}
                            </span>
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Surface>
    </section>
  );
}
