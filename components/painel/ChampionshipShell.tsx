"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, Menu, X, ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/PageContainer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CHAMPIONSHIP_NAV_GROUPS,
  isChampionshipNavItemActive,
  championshipPageTitle,
} from "@/components/painel/championship-nav-items";
import type { ChampionshipStatus } from "@/lib/types";

export type ChampionshipNavSummary = {
  id: string;
  nome: string;
  status: ChampionshipStatus;
};

// Navegação contextual de um campeonato, aninhada DENTRO do shell global
// (sidebar + topbar do app continuam visíveis, com "Organizador" ativo).
//
// O cabeçalho fica enxuto de propósito: breadcrumb, nome, status, "Página
// pública" e um único botão "Gerenciar" que abre um menu com todas as
// seções. Nenhuma lista de seções fica solta acima do conteúdo — cada
// página decide sua própria hierarquia (ex.: a visão geral mostra os
// atalhos de gestão logo abaixo dos cards de métricas, via
// ChampionshipActions).
export function ChampionshipShell({
  champ,
  children,
}: {
  champ: ChampionshipNavSummary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOverview = pathname === `/painel/campeonatos/${champ.id}`;
  const sectionTitle = championshipPageTitle(pathname, champ.id);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-app-bg">
      {/* ── Cabeçalho contextual: breadcrumb + nome + status + ações ── */}
      <div className="relative border-b border-border bg-surface">
        <PageContainer width="wide" className="space-y-2 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                <Link href="/painel/campeonatos" className="inline-flex items-center gap-1 hover:text-blue-600">
                  <ArrowLeft className="size-3" /> Meus campeonatos
                </Link>
                <ChevronRight className="size-3 shrink-0" />
                {isOverview || !sectionTitle ? (
                  <span className="truncate font-medium text-ink">{champ.nome}</span>
                ) : (
                  <>
                    <Link href={`/painel/campeonatos/${champ.id}`} className="truncate hover:text-blue-600">
                      {champ.nome}
                    </Link>
                    <ChevronRight className="size-3 shrink-0" />
                    <span className="truncate font-medium text-ink">{sectionTitle}</span>
                  </>
                )}
              </nav>
              <div className="mt-1.5 flex items-center gap-2">
                <h1 className="truncate text-lg font-bold text-ink">{champ.nome}</h1>
                <StatusBadge status={champ.status} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/campeonatos/${champ.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-blue-300 hover:text-blue-600"
              >
                <ExternalLink className="size-3.5" /> Página pública
              </a>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Menu className="size-3.5" /> Gerenciar
                </button>

                {/* Popover no desktop */}
                {menuOpen && (
                  <div
                    role="menu"
                    aria-label="Seções do campeonato"
                    className="absolute right-0 top-full z-40 mt-2 hidden w-72 max-h-[70vh] overflow-y-auto rounded-card-lg bg-surface p-2 shadow-elevated ring-1 ring-border md:block"
                  >
                    <ChampionshipNavContent champId={champ.id} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </PageContainer>

        {/* Drawer no mobile */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-xs flex-col bg-surface shadow-xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <span className="text-sm font-bold text-ink">Gerenciar campeonato</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
                <ChampionshipNavContent champId={champ.id} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Conteúdo — cada página decide sua própria hierarquia interna ── */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ChampionshipNavContent({
  champId,
  pathname,
  onNavigate,
}: {
  champId: string;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Navegação do campeonato" className="space-y-4">
      {CHAMPIONSHIP_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const href = item.href(champId);
              const active = isChampionshipNavItemActive(pathname, href, item.matchExact);
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-blue-600 text-white" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <Icon className="size-[17px] shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
