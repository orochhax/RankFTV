"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, ChevronDown, ChevronsLeft, ChevronsRight, ExternalLink, LogOut, Plus, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { ARENA_NAV_GROUPS, isArenaNavItemActive, arenaPageTitle } from "@/components/arena/arena-nav-items";

export type ArenaSummary = { id: string; nome: string; handle: string; avatarUrl: string | null };
export type ArenaOwnerUser = { nome: string; username: string } | null;

export function ArenaShell({
  arena,
  arenas,
  user,
  children,
}: {
  arena: ArenaSummary;
  arenas: ArenaSummary[];
  user: ArenaOwnerUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Fecha o drawer/trocador ao navegar — chamado nos onClick dos links de
  // navegação (não num efeito, pra não disparar setState fora de um evento).
  function closeOverlays() {
    setDrawerOpen(false);
    setSwitcherOpen(false);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const title = arenaPageTitle(pathname, arena.handle);

  return (
    <div className="min-h-screen bg-surface-2 md:flex">
      {/* ── Sidebar desktop ── */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <ArenaNavContent
          arena={arena}
          arenas={arenas}
          user={user}
          pathname={pathname}
          collapsed={collapsed}
          switcherOpen={switcherOpen}
          onToggleSwitcher={() => setSwitcherOpen((s) => !s)}
          onNavigate={closeOverlays}
          onLogout={handleLogout}
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex items-center justify-center gap-2 border-t border-border py-3 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              <span className="text-xs font-medium">Recolher</span>
            </>
          )}
        </button>
      </aside>

      {/* ── Coluna principal ── */}
      <div className="min-w-0 flex-1">
        {/* Topbar desktop */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur md:flex">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink-muted">{arena.nome}</p>
            <h1 className="truncate text-base font-bold text-ink">{title}</h1>
          </div>
          <a
            href={`/arenas/${arena.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-blue-300 hover:text-blue-600"
          >
            <ExternalLink className="size-3.5" /> Página pública
          </a>
        </header>

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
          <Avatar nome={arena.nome} color="bg-blue-600" size="sm" fotoUrl={arena.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-ink">{arena.nome}</p>
            <p className="truncate text-[11px] leading-tight text-ink-muted">{title}</p>
          </div>
        </header>

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

function ArenaNavContent({
  arena,
  arenas,
  user,
  pathname,
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
  collapsed: boolean;
  switcherOpen: boolean;
  onToggleSwitcher: () => void;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const outras = arenas.filter((a) => a.id !== arena.id);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Trocar de arena */}
      <div className="border-b border-border p-3">
        {outras.length === 0 ? (
          <div className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
            <Avatar nome={arena.nome} color="bg-blue-600" size="sm" fotoUrl={arena.avatarUrl} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{arena.nome}</p>
                <p className="truncate text-xs text-ink-muted">@{arena.handle}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleSwitcher}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2 ${collapsed ? "justify-center" : ""}`}
              aria-expanded={switcherOpen}
            >
              <Avatar nome={arena.nome} color="bg-blue-600" size="sm" fotoUrl={arena.avatarUrl} />
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
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
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
                          ? "bg-blue-600 text-white"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                      {!collapsed && item.label}
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
