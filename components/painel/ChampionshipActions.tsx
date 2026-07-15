import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Surface } from "@/components/shell/Surface";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { CHAMPIONSHIP_NAV_GROUPS } from "@/components/painel/championship-nav-items";

// Atalhos de gestão do campeonato — fonte única é CHAMPIONSHIP_NAV_GROUPS
// (mesmos hrefs do menu "Gerenciar" do shell), só reorganizados visualmente:
// "Editar campeonato" migra do grupo "Principal" pra junto de "Atletas", e
// "Visão geral" nunca aparece aqui (a página que renderiza isso já É a
// visão geral).
export function ChampionshipActions({ champId }: { champId: string }) {
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
      <Surface padding="md" className="mt-3 space-y-5">
        {grupos.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">{group.label}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href(champId)}
                    className="group flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-medium text-ink transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <Icon className="size-4 shrink-0 text-blue-600" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </Surface>
    </section>
  );
}
