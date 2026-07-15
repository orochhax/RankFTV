"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsRight,
  LogIn,
  LogOut,
  Plus,
  Settings,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import {
  isAppNavItemActive,
  visibleAppNavItems,
  type AppNavPermissions,
} from "@/components/shell/app-nav-items";

export type SidebarUser = { nome: string; username: string; fotoUrl: string | null } | null;

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Principal", keys: ["campeonatos", "arenas", "agenda", "ingressos"] },
  { label: "Minha conta", keys: ["inscricoes"] },
  { label: "Gestao", keys: ["painel", "arena", "staff", "admin"] },
];

export function DesktopSidebar({
  user,
  perms,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleAppNavItems(perms);
  const itemByKey = new Map(items.map((i) => [i.key, i]));
  const activeKey = items.find((item) => isAppNavItemActive(pathname, item))?.key ?? null;
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ top: number; left: number; width: number; height: number; ready: boolean }>({
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    ready: false,
  });
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measureActiveItem() {
      if (!activeKey || !navRef.current) {
        setIndicator((current) => ({ ...current, ready: false }));
        return;
      }

      const node = itemRefs.current.get(activeKey);
      if (!node) return;

      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = node.getBoundingClientRect();
      setIndicator({
        top: itemRect.top - navRect.top + navRef.current.scrollTop,
        left: itemRect.left - navRect.left,
        width: itemRect.width,
        height: itemRect.height,
        ready: true,
      });
    }

    measureActiveItem();
    window.addEventListener("resize", measureActiveItem);
    return () => window.removeEventListener("resize", measureActiveItem);
  }, [activeKey, items.length]);

  function setItemRef(key: string) {
    return (node: HTMLAnchorElement | null) => {
      if (node) itemRefs.current.set(key, node);
      else itemRefs.current.delete(key);
    };
  }

  useEffect(() => {
    if (!quickMenuOpen && !accountMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setQuickMenuOpen(false);
        setAccountMenuOpen(false);
      }
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (quickMenuRef.current && !quickMenuRef.current.contains(target)) setQuickMenuOpen(false);
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) setAccountMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [quickMenuOpen, accountMenuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-20 shrink-0 flex-col items-center border-r border-border bg-surface px-3 py-4 md:flex">
      <Link
        href="/"
        aria-label="RankFTV"
        title="RankFTV"
        className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black tracking-tight text-white shadow-soft shadow-blue-600/20 transition-colors hover:bg-blue-500"
      >
        FTV
      </Link>

      <div ref={quickMenuRef} className="relative mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setQuickMenuOpen((open) => !open)}
          aria-label="Criar ou adicionar"
          aria-expanded={quickMenuOpen}
          aria-haspopup="menu"
          title="Criar ou adicionar"
          className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-blue-600 ring-1 ring-border transition-colors hover:bg-blue-50 hover:ring-blue-200"
        >
          <Plus className="size-5" strokeWidth={2.4} />
        </button>

        {quickMenuOpen && (
          <div
            role="menu"
            aria-label="Acoes rapidas"
            className="absolute left-full top-0 z-50 ml-3 w-64 overflow-hidden rounded-card-lg bg-surface p-2 shadow-elevated ring-1 ring-border"
          >
            <Link
              href={perms.isLoggedIn ? "/painel/novo-campeonato" : "/cadastro?modo=organizador"}
              role="menuitem"
              onClick={() => setQuickMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Trophy className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">Criar campeonato</span>
                <span className="block truncate text-xs font-normal text-ink-muted">Organizar um novo evento</span>
              </span>
            </Link>
            <Link
              href={perms.isLoggedIn ? "/perfil/ativar-arena" : "/cadastro"}
              role="menuitem"
              onClick={() => setQuickMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-blue-600 ring-1 ring-border">
                <Plus className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">Cadastrar arena</span>
                <span className="block truncate text-xs font-normal text-ink-muted">Abrir painel de aulas e planos</span>
              </span>
            </Link>
          </div>
        )}
      </div>

      <nav ref={navRef} aria-label="Navegacao principal" className="relative mt-6 flex min-h-0 flex-1 flex-col items-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-0 rounded-2xl bg-blue-600 shadow-soft shadow-blue-600/20 transition-[left,top,width,height,opacity] duration-[260ms] ease-out motion-reduce:transition-none"
          style={{
            left: indicator.left,
            top: indicator.top,
            width: indicator.width,
            height: indicator.height,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {GROUPS.map((group, index) => {
          const groupItems = group.keys.map((k) => itemByKey.get(k)).filter((i): i is NonNullable<typeof i> => !!i);
          if (groupItems.length === 0) return null;

          return (
            <div key={group.label} className={`flex w-full flex-col items-center ${index > 0 ? "mt-4 border-t border-border pt-4" : ""}`}>
              <ul className="flex w-full flex-col items-center gap-1">
                {groupItems.map((item) => {
                  const active = isAppNavItemActive(pathname, item);
                  const Icon = item.icon;

                  return (
                    <li key={item.key} className="flex w-full justify-center">
                      <Link
                        ref={setItemRef(item.key)}
                        href={item.href}
                        title={item.label}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={`group relative z-10 flex size-11 items-center justify-center rounded-2xl transition-colors duration-200 ${
                          active
                            ? `${indicator.ready ? "" : "bg-blue-600 shadow-soft shadow-blue-600/20"} text-white`
                            : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        <Icon className="size-5 shrink-0 transition-colors duration-200" strokeWidth={2} />
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-visible:block">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
        {user ? (
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label={`Menu da conta de ${user.nome}`}
              title={user.nome}
              className="flex size-11 items-center justify-center rounded-2xl transition-colors hover:bg-surface-2"
            >
              <Avatar nome={user.nome} color="bg-blue-600" size="sm" fotoUrl={user.fotoUrl} />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                aria-label="Menu da conta"
                className="absolute bottom-0 left-full z-50 ml-3 w-60 overflow-hidden rounded-card-lg bg-surface p-2 shadow-elevated ring-1 ring-border"
              >
                <div className="mb-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                  <Avatar nome={user.nome} color="bg-blue-600" size="sm" fotoUrl={user.fotoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.nome}</p>
                    <p className="truncate text-xs text-ink-muted">@{user.username}</p>
                  </div>
                </div>
                <Link
                  href="/perfil"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-2"
                >
                  <User className="size-4 text-ink-muted" /> Perfil
                </Link>
                <Link
                  href="/perfil/conta"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-2"
                >
                  <Settings className="size-4 text-ink-muted" /> Configuracoes
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
                >
                  <LogOut className="size-4" /> Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              href="/login"
              title="Entrar"
              aria-label="Entrar"
              className="flex size-11 items-center justify-center rounded-2xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogIn className="size-5" />
            </Link>
            <Link
              href="/cadastro"
              title="Cadastrar"
              aria-label="Cadastrar"
              className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition-colors hover:bg-blue-500"
            >
              <UserPlus className="size-5" />
            </Link>
          </>
        )}

        <Link
          href={perms.isLoggedIn ? "/perfil" : "/login"}
          title={perms.isLoggedIn ? "Minha conta" : "Entrar"}
          aria-label={perms.isLoggedIn ? "Minha conta" : "Entrar"}
          className="flex size-10 items-center justify-center rounded-2xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronsRight className="size-4" />
        </Link>
      </div>
    </aside>
  );
}
