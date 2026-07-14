"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import {
  isAppNavItemActive, visibleAppNavItems, type AppNavPermissions,
} from "@/components/shell/app-nav-items";

export type SidebarUser = { nome: string; username: string; fotoUrl: string | null } | null;

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Principal", keys: ["campeonatos", "arenas", "agenda", "ingressos"] },
  { label: "Minha conta", keys: ["inscricoes", "perfil"] },
  { label: "Gestão", keys: ["painel", "arena", "staff", "admin"] },
];

export function DesktopSidebar({
  user,
  perms,
  collapsed,
  onToggleCollapsed,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleAppNavItems(perms);
  const itemByKey = new Map(items.map((i) => [i.key, i]));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex h-16 shrink-0 items-center border-b border-border px-4 ${collapsed ? "justify-center px-0" : ""}`}>
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          {collapsed ? (
            <span className="text-blue-600">FTV</span>
          ) : (
            <>Rank<span className="text-blue-600">FTV</span></>
          )}
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-5 overflow-y-auto p-3">
        {GROUPS.map((group) => {
          const groupItems = group.keys.map((k) => itemByKey.get(k)).filter((i): i is NonNullable<typeof i> => !!i);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const active = isAppNavItemActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
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
          );
        })}
      </nav>

      {/* Rodapé — usuário ou entrar/cadastrar */}
      <div className="border-t border-border p-3">
        {user ? (
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <Avatar nome={user.nome} color="bg-blue-600" size="sm" fotoUrl={user.fotoUrl} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.nome}</p>
                <p className="truncate text-xs text-ink-muted">@{user.username}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da conta"
              title="Sair"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : collapsed ? (
          <Link
            href="/login"
            title="Entrar"
            className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white"
          >
            <ChevronsRight className="size-4" />
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl border border-border px-3 py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Cadastrar
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink`}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /><span className="text-xs font-medium">Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
