"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  History,
  LayoutDashboard,
  Library,
  Radar,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

const base = "/admin/youtube";
const primary = [
  { href: base, label: "Visão geral", icon: LayoutDashboard },
  { href: `${base}/tendencias`, label: "Radar de tendências", icon: Radar },
  { href: `${base}/oportunidades`, label: "Oportunidades", icon: Sparkles },
  { href: `${base}/ideias`, label: "Biblioteca de ideias", icon: Library },
];
const secondary = [
  { href: `${base}/fontes`, label: "Fontes", icon: History },
  { href: `${base}/configuracoes`, label: "Configurações", icon: Settings },
];

export function PulsoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon }: (typeof primary)[number]) => (
    <Link
      key={href}
      href={href}
      className={pathname === href ? "yt-nav-item is-active" : "yt-nav-item"}
      aria-current={pathname === href ? "page" : undefined}
      title={label}
    >
      <Icon size={18} />
      <span>{label}</span>
      {href.endsWith("/oportunidades") ? <b>Novo</b> : null}
    </Link>
  );

  return (
    <div className="yt-shell">
      <aside className="yt-sidebar">
        <Link href={base} className="yt-brand">
          <span className="yt-brand-mark"><Activity size={19} /></span>
          <span>PULSO<span>.AI</span></span>
        </Link>
        <nav className="yt-nav-groups" aria-label="Navegação do Pulso.AI">
          <div>
            <p className="yt-nav-label">INTELIGÊNCIA</p>
            {primary.map(item)}
          </div>
          <div>
            <p className="yt-nav-label">SISTEMA</p>
            {secondary.map(item)}
          </div>
        </nav>
        <div className="yt-sidebar-foot">
          <div className="yt-workspace-chip">
            <span>YC</span>
            <div><strong>Meu canal</strong><small>Workspace privado</small></div>
          </div>
          <Link href="/admin" className="yt-icon-button" aria-label="Voltar ao painel Admin" title="Voltar ao painel Admin">
            <ArrowLeft size={17} />
          </Link>
        </div>
      </aside>
      <div className="yt-main">
        <header className="yt-topbar">
          <div className="yt-global-search">
            <Search size={17} />
            <span>Buscar notícias, tendências e ideias...</span>
            <kbd>⌘ K</kbd>
          </div>
          <div className="yt-topbar-state"><span className="yt-live-dot" /> Radar manual pelo Codex</div>
        </header>
        {children}
      </div>
    </div>
  );
}
