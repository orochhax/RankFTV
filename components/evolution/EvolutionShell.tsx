"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, BarChart3, BrainCircuit, BriefcaseBusiness, Clapperboard, Database, Dumbbell, House, LayoutGrid, Library, ListChecks, Menu, Radar, Settings, Sparkles, Trophy } from "lucide-react";

const base = "/admin/evolucao";
const navigation = [
  { href: base, label: "Visão geral", icon: House },
  { href: `${base}/datascience`, label: "DataScience", icon: BrainCircuit },
  { href: `${base}/rocha-tech`, label: "Canal Rocha Tech", icon: Clapperboard },
  { href: `${base}/insta-shape`, label: "Insta / Shape", icon: Dumbbell },
  { href: `${base}/rankftv`, label: "RankFTV", icon: Trophy },
];

const rochaTechNavigation = [
  { href: `${base}/rocha-tech?view=inteligencia`, label: "Inteligência do canal", icon: BrainCircuit },
  { href: `${base}/rocha-tech`, label: "Visão do canal", icon: LayoutGrid },
  { href: `${base}/rocha-tech/ideias`, label: "Biblioteca de ideias", icon: Library },
  { href: `${base}/rocha-tech/tendencias`, label: "Radar de tendências", icon: Radar },
  { href: `${base}/rocha-tech/oportunidades`, label: "Oportunidades", icon: Sparkles },
  { href: `${base}/rocha-tech/fontes`, label: "Fontes", icon: Database },
  { href: `${base}/rocha-tech/configuracoes`, label: "Configurações", icon: Settings },
];

const dataScienceNavigation = [
  { href: `${base}/datascience`, label: "Plano de estudos", icon: ListChecks },
  { href: `${base}/datascience/servicos`, label: "Serviços desbloqueados", icon: BriefcaseBusiness },
];

export function EvolutionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="evo-shell">
      <aside className="evo-sidebar">
        <Link className="evo-brand" href={base}>
          <span><Activity size={20} /></span>
          <div>Central de <strong>Evolução</strong></div>
        </Link>
        <p className="evo-nav-label">SEU SISTEMA</p>
        <nav aria-label="Áreas da Central de Evolução">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === base ? pathname === href : pathname.startsWith(href);
            return (
              <div className="evo-nav-group" key={href}>
                <Link href={href} className={`evo-nav-item${active ? " is-active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
                  <Icon size={18} /><span>{label}</span>
                </Link>
                {href.endsWith("/datascience") && active ? <div className="evo-subnav">{dataScienceNavigation.map(({ href: childHref, label: childLabel, icon: ChildIcon }) => {
                  const childActive = childHref === `${base}/datascience` ? pathname === childHref : pathname.startsWith(childHref);
                  return <Link key={childHref} href={childHref} className={childActive ? "is-active" : ""} aria-current={childActive ? "page" : undefined}><ChildIcon size={14} /><span>{childLabel}</span></Link>;
                })}</div> : null}
                {href.endsWith("/rocha-tech") && active ? <div className="evo-subnav">{rochaTechNavigation.map(({ href: childHref, label: childLabel, icon: ChildIcon }) => {
                  const childActive = childHref.includes("?") ? pathname === `${base}/rocha-tech` && searchParams.get("view") === "inteligencia" : childHref === `${base}/rocha-tech` ? pathname === childHref && !searchParams.get("view") : pathname.startsWith(childHref);
                  return <Link key={childHref} href={childHref} className={childActive ? "is-active" : ""} aria-current={childActive ? "page" : undefined}><ChildIcon size={14} /><span>{childLabel}</span></Link>;
                })}</div> : null}
              </div>
            );
          })}
        </nav>
        <div className="evo-sidebar-foot">
          <BarChart3 size={17} />
          <div><strong>Progresso real</strong><small>Sem atalhos. Sem desculpas.</small></div>
        </div>
      </aside>
      <header className="evo-mobile-nav">
        <Link className="evo-brand" href={base}><span><Activity size={18} /></span><div>Central de <strong>Evolução</strong></div></Link>
        <details>
          <summary aria-label="Abrir menu"><Menu size={21} /></summary>
          <nav>{navigation.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}{dataScienceNavigation.map(({ href, label }) => <Link className="is-child" key={href} href={href}>↳ {label}</Link>)}{rochaTechNavigation.map(({ href, label }) => <Link className="is-child" key={href} href={href}>↳ {label}</Link>)}</nav>
        </details>
      </header>
      <div className="evo-main">{children}</div>
    </div>
  );
}
