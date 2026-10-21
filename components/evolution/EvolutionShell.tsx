"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, BrainCircuit, Clapperboard, Dumbbell, House, Menu, Trophy } from "lucide-react";

const base = "/admin/evolucao";
const navigation = [
  { href: base, label: "Visão geral", icon: House },
  { href: `${base}/datascience`, label: "DataScience", icon: BrainCircuit },
  { href: `${base}/rocha-tech`, label: "Canal Rocha Tech", icon: Clapperboard },
  { href: `${base}/insta-shape`, label: "Insta / Shape", icon: Dumbbell },
  { href: `${base}/rankftv`, label: "RankFTV", icon: Trophy },
];

export function EvolutionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
              <Link key={href} href={href} className={`evo-nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={18} /><span>{label}</span>
              </Link>
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
          <nav>{navigation.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}</nav>
        </details>
      </header>
      <div className="evo-main">{children}</div>
    </div>
  );
}
