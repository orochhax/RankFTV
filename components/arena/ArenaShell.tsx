"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, ChevronDown, ExternalLink, LayoutDashboard, LogOut, Plus, Building2, Lock, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { ARENA_NAV_GROUPS, isArenaNavItemActive, arenaPageTitle } from "@/components/arena/arena-nav-items";
import { ArenaPlanLimitBanner } from "@/components/arena/ArenaPlanLimitBanner";
import type { ArenaPlatformTierId } from "@/lib/arena-platform-plans";

export type ArenaSummary = { id: string; nome: string; handle: string; avatarUrl: string | null };
export type ArenaOwnerUser = { nome: string; username: string } | null;

export function ArenaShell({
  arena,
  arenas,
  user,
  totalAlunosAtivos = 0,
  tierId = "start",
  children,
}: {
  arena: ArenaSummary;
  arenas: ArenaSummary[];
  user: ArenaOwnerUser;
  totalAlunosAtivos?: number;
  tierId?: ArenaPlatformTierId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Fecha o drawer/trocador ao navegar — chamado nos onClick dos links de
  // navegação (não num efeito, pra não disparar setState fora de um evento).
  function closeOverlays() {
    setDrawerOpen(false);
    setSwitcherOpen(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const title = arenaPageTitle(pathname, arena.handle);

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="min-w-0 flex-1">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 active:bg-gray-200"
          >
            <Menu className="size-5" />
          </button>
          <Avatar nome={arena.nome} color="bg-brand" size="sm" fotoUrl={arena.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-ink">{arena.nome}</p>
            <p className="truncate text-[11px] leading-tight text-ink-muted">{title}</p>
          </div>
          <Link
            href="/painel"
            aria-label="Voltar ao painel geral"
            title="Voltar ao painel geral"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 active:bg-gray-200"
          >
            <LayoutDashboard className="size-5" />
          </Link>
        </header>

        <ArenaDesktopSubnav
          arena={arena}
          pathname={pathname}
          totalAlunosAtivos={totalAlunosAtivos}
          tierId={tierId}
          onNavigate={closeOverlays}
        />

        <ArenaPlanLimitBanner
          totalAlunosAtivos={totalAlunosAtivos}
          arenaHandle={arena.handle}
        />

        <div className="pb-[max(env(safe-area-inset-bottom),16px)] md:pb-8">{children}</div>
      </div>

      {/* ── Drawer mobile ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col bg-surface shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-bold text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),12px)]">
              <ArenaNavContent
                arena={arena}
                arenas={arenas}
                user={user}
                pathname={pathname}
                tierId={tierId}
                collapsed={false}
                switcherOpen={switcherOpen}
                onToggleSwitcher={() => setSwitcherOpen((s) => !s)}
                onNavigate={closeOverlays}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArenaDesktopSubnav({
  arena,
  pathname,
  totalAlunosAtivos = 0,
  tierId = "start",
  onNavigate,
}: {
  arena: ArenaSummary;
  pathname: string;
  totalAlunosAtivos?: number;
  tierId?: ArenaPlatformTierId;
  onNavigate: () => void;
}) {
  const navItems = ARENA_NAV_GROUPS.flatMap((group) => group.items);

  return (
    <div className="sticky top-0 z-20 hidden border-b border-black/10 bg-white/95 px-6 py-2.5 backdrop-blur-md shadow-xs md:block">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">{arena.nome}</span>
            <span className="text-gray-300">/</span>
            <h2 className="text-sm font-bold text-gray-900">{arenaPageTitle(pathname, arena.handle)}</h2>
          </div>

          <div className="flex items-center gap-2.5">
            {tierId === "pro" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent px-3 py-1 text-xs font-black text-accent-ink">
                <Sparkles className="size-3" />
                ⭐ Pro Ativo · Ilimitado
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/arena/${arena.handle}/assinatura`}
                  title="Consultar limites de capacidade"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                >
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  Plano Start · {totalAlunosAtivos}/30 alunos
                </Link>
                <Link
                  href={`/arena/${arena.handle}/assinatura`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover active:scale-95"
                >
                  <Sparkles className="size-3" /> Upgrade Pro
                </Link>
              </div>
            )}

            <a
              href={`/arenas/${arena.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-gray-700 shadow-xs transition hover:border-black hover:text-black"
            >
              <ExternalLink className="size-3.5" /> Página pública
            </a>
          </div>
        </div>

        <nav aria-label="Navegacao do painel da arena" className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const href = item.href(arena.handle);
            const active = isArenaNavItemActive(pathname, href, item.matchExact);
            const isProLocked = item.requiresPro && tierId === "start";
            const Icon = item.icon;

            if (isProLocked) {
              return (
                <Link
                  key={item.key}
                  href={href}
                  onClick={onNavigate}
                  title={`${item.label} (Exclusivo do Plano Pro)`}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-2.5 text-xs font-medium text-gray-400 transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800"
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-800">
                    <Lock className="size-2.5" /> PRO
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.key}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all ${
                  active
                    ? "bg-brand text-white shadow-xs"
                    : "bg-gray-100/80 text-gray-700 hover:bg-gray-200/90 hover:text-black"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function ArenaNavContent({
  arena,
  arenas,
  user,
  pathname,
  tierId = "start",
  collapsed,
  switcherOpen,
  onToggleSwitcher,
  onNavigate,
  onLogout,
}: {
  arena: ArenaSummary;
  arenas: ArenaSummary[];
  user: ArenaOwnerUser;
  pathname: string;
  tierId?: ArenaPlatformTierId;
  collapsed: boolean;
  switcherOpen: boolean;
  onToggleSwitcher: () => void;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const outras = arenas.filter((a) => a.id !== arena.id);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Marca — deixa claro que o painel da arena é parte do RankFTV */}
      <Link
        href="/painel"
        onClick={onNavigate}
        title={collapsed ? "RankFTV" : undefined}
        aria-label={collapsed ? "RankFTV — voltar ao painel geral" : undefined}
        className={`flex items-center gap-1.5 border-b border-border px-3 py-2.5 text-xs font-bold tracking-tight text-ink transition-colors hover:text-brand-ink ${collapsed ? "justify-center" : ""}`}
      >
        {collapsed ? (
          <span className="text-brand">FTV</span>
        ) : (
          <>Rank<span className="text-brand">FTV</span></>
        )}
      </Link>

      {/* Trocar de arena */}
      <div className="border-b border-border p-3">
        {outras.length === 0 ? (
          <div className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
            <Avatar nome={arena.nome} color="bg-brand" size="sm" fotoUrl={arena.avatarUrl} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{arena.nome}</p>
                <p className="truncate text-xs text-ink-muted">@{arena.handle}</p>
              </div>
            )}
          </div>
        ) : collapsed ? (
          <Link
            href="/arena"
            onClick={onNavigate}
            title="Minhas arenas"
            aria-label="Minhas arenas"
            className="flex items-center justify-center rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2"
          >
            <Avatar nome={arena.nome} color="bg-brand" size="sm" fotoUrl={arena.avatarUrl} />
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleSwitcher}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2 ${collapsed ? "justify-center" : ""}`}
              aria-expanded={switcherOpen}
            >
              <Avatar nome={arena.nome} color="bg-brand" size="sm" fotoUrl={arena.avatarUrl} />
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-bold text-ink">{arena.nome}</p>
                    <p className="truncate text-xs text-ink-muted">Trocar de arena</p>
                  </div>
                  <ChevronDown className={`size-4 shrink-0 text-ink-muted transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
            {switcherOpen && !collapsed && (
              <div className="mt-1.5 space-y-0.5">
                {outras.map((a) => (
                  <Link
                    key={a.id}
                    href={`/arena/${a.handle}`}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2"
                  >
                    <Avatar nome={a.nome} color="bg-gray-400" size="sm" fotoUrl={a.avatarUrl} />
                    <span className="truncate">{a.nome}</span>
                  </Link>
                ))}
                <Link
                  href="/perfil/ativar-arena"
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-soft"
                >
                  <Plus className="size-4" /> Nova arena
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Grupos de navegação */}
      <nav aria-label="Navegação do painel da arena" className="flex-1 space-y-5 p-3">
        {ARENA_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const href = item.href(arena.handle);
                const active = isArenaNavItemActive(pathname, href, item.matchExact);
                const isProLocked = item.requiresPro && tierId === "start";
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors ${
                        collapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-brand text-white font-bold"
                          : isProLocked
                          ? "text-gray-400 hover:bg-amber-50/50 hover:text-amber-800"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between">
                          <span>{item.label}</span>
                          {isProLocked && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-800">
                              <Lock className="size-2.5" /> PRO
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Outros */}
        <div>
          {!collapsed && (
            <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Outros</p>
          )}
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/painel"
                onClick={onNavigate}
                title={collapsed ? "Voltar ao painel geral" : undefined}
                aria-label={collapsed ? "Voltar ao painel geral" : undefined}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? "justify-center" : ""}`}
              >
                <LayoutDashboard className="size-[18px] shrink-0" strokeWidth={2} />
                {!collapsed && "Voltar ao painel geral"}
              </Link>
            </li>
            <li>
              <a
                href={`/arenas/${arena.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? "Ver página pública" : undefined}
                aria-label={collapsed ? "Ver página pública da arena" : undefined}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? "justify-center" : ""}`}
              >
                <Building2 className="size-[18px] shrink-0" strokeWidth={2} />
                {!collapsed && "Ver página pública"}
              </a>
            </li>
            <li>
              <Link
                href="/arena"
                onClick={onNavigate}
                title={collapsed ? "Minhas arenas" : undefined}
                aria-label={collapsed ? "Minhas arenas" : undefined}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? "justify-center" : ""}`}
              >
                <ChevronDown className="size-[18px] shrink-0 -rotate-90" strokeWidth={2} />
                {!collapsed && "Minhas arenas"}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Usuário organizador */}
      {user && (
        <div className={`flex items-center gap-2.5 border-t border-border p-3 ${collapsed ? "justify-center" : ""}`}>
          <Avatar nome={user.nome} color="bg-gray-700" size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.nome}</p>
              <p className="truncate text-xs text-ink-muted">@{user.username}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair da conta"
            title="Sair"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
