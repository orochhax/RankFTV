"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Link2,
  LogIn,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import {
  isAppNavItemActive,
  visibleAppNavItems,
  type AppNavPermissions,
} from "@/components/shell/app-nav-items";
import { criarCampeonatoHref, cadastrarArenaHref } from "@/lib/organizer-entry-links";
import { FloatingMenu } from "@/components/shell/FloatingMenu";

export type SidebarUser = { nome: string; username: string; fotoUrl: string | null } | null;

const COLLAPSE_COOKIE = "sidebar_collapsed";

type NotificationPreview = {
  id: string;
  title: string;
  description: string;
  href: string;
  unread: boolean;
  kind: "staff" | "team" | "notice";
};

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Principal", keys: ["campeonatos", "arenas", "agenda", "ingressos"] },
  { label: "Minha conta", keys: ["inscricoes"] },
  { label: "Gestao", keys: ["painel", "arena", "staff", "admin"] },
];

export function DesktopSidebar({
  user,
  perms,
  notifCount,
  initialCollapsed,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
  notifCount: number;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleAppNavItems(perms);
  const itemByKey = new Map(items.map((i) => [i.key, i]));
  const activeKey = items.find((item) => isAppNavItemActive(pathname, item))?.key ?? null;
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [navTooltip, setNavTooltip] = useState<{ label: string; top: number } | null>(null);
  const [indicator, setIndicator] = useState<{ top: number; left: number; width: number; height: number; ready: boolean }>({
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    ready: false,
  });
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const quickMenuButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      setNavTooltip(null);
      return next;
    });
  }

  // Reposiciona o "trilho" azul do item ativo. Um ResizeObserver na <nav>
  // acompanha qualquer mudança de largura — inclusive a animação de
  // recolher/expandir — mantendo o realce alinhado sem timers.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

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
    const ro = new ResizeObserver(() => measureActiveItem());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeKey, items.length]);

  function setItemRef(key: string) {
    return (node: HTMLAnchorElement | null) => {
      if (node) itemRefs.current.set(key, node);
      else itemRefs.current.delete(key);
    };
  }

  function showNavTooltip(label: string, node: HTMLElement) {
    if (!collapsed) return;
    const rect = node.getBoundingClientRect();
    setNavTooltip({ label, top: rect.top + rect.height / 2 });
  }

  // Menu "+" cuida do próprio fechamento (portal). Este efeito só cobre os
  // popovers de conta e notificações, posicionados localmente na sidebar.
  useEffect(() => {
    if (!accountMenuOpen && !notificationMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAccountMenuOpen(false);
        setNotificationMenuOpen(false);
      }
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) setAccountMenuOpen(false);
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) setNotificationMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [accountMenuOpen, notificationMenuOpen]);

  useEffect(() => {
    if (!notificationMenuOpen || notificationsLoaded || notificationsLoading) return;

    async function loadNotifications() {
      setNotificationsLoading(true);
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth.user;

      if (!currentUser) {
        setNotifications([]);
        setNotificationsLoaded(true);
        setNotificationsLoading(false);
        return;
      }

      const [staffRes, teamRes, noticeRes] = await Promise.all([
        supabase
          .from("championship_staff")
          .select("id, created_at, championships(id, nome)")
          .eq("user_id", currentUser.id)
          .eq("status", "pendente")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("teams")
          .select("id, created_at, championship_id, championships(nome), championship_categories(nome)")
          .eq("atleta2_id", currentUser.id)
          .eq("status", "convite_pendente")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("notifications")
          .select("id, tipo, titulo, mensagem, lida, championship_id, created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      type StaffRow = {
        id: string;
        created_at: string | null;
        championships: { id: string; nome: string } | null;
      };
      type TeamRow = {
        id: string;
        created_at: string | null;
        championship_id: string;
        championships: { nome: string } | null;
        championship_categories: { nome: string } | null;
      };
      type NoticeRow = {
        id: string;
        tipo: string | null;
        titulo: string;
        mensagem: string;
        lida: boolean;
        championship_id: string | null;
        created_at: string | null;
      };

      const staffItems = ((staffRes.data ?? []) as unknown as StaffRow[]).map((row) => ({
        id: `staff-${row.id}`,
        title: row.championships?.nome ?? "Convite de staff",
        description: "Voce recebeu um convite para a equipe do campeonato.",
        href: "/notificacoes",
        unread: true,
        kind: "staff" as const,
        createdAt: row.created_at,
      }));

      const teamItems = ((teamRes.data ?? []) as unknown as TeamRow[]).map((row) => ({
        id: `team-${row.id}`,
        title: row.championships?.nome ?? "Convite de dupla",
        description: `Categoria ${row.championship_categories?.nome ?? "a definir"}`,
        href: "/notificacoes",
        unread: true,
        kind: "team" as const,
        createdAt: row.created_at,
      }));

      const noticeItems = ((noticeRes.data ?? []) as unknown as NoticeRow[]).map((row) => ({
        id: `notice-${row.id}`,
        title: row.titulo,
        description: row.mensagem,
        href: row.tipo === "convite_pagina" && row.championship_id
          ? `/painel/campeonatos/${row.championship_id}`
          : "/notificacoes",
        unread: !row.lida,
        kind: "notice" as const,
        createdAt: row.created_at,
      }));

      const nextNotifications = [...staffItems, ...teamItems, ...noticeItems]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          href: item.href,
          unread: item.unread,
          kind: item.kind,
        }));

      setNotifications(nextNotifications);
      setNotificationsLoaded(true);
      setNotificationsLoading(false);
    }

    void loadNotifications();
  }, [notificationMenuOpen, notificationsLoaded, notificationsLoading]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Linha de botão que vira ícone-centrado (recolhido) ou ícone + rótulo
  // (expandido). `!w-full` vence a largura fixa de .rankftv-desktop-sidebar__button.
  const rowClass = (extra = "") =>
    `rankftv-desktop-sidebar__button group relative flex h-11 items-center rounded-2xl transition-colors duration-200 ${
      collapsed ? "justify-center" : "!w-full justify-start gap-3 px-3"
    } ${extra}`;

  return (
    <aside
      className={`rankftv-desktop-sidebar sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-zinc-800 bg-black px-3 py-4 transition-[width] duration-200 md:flex ${
        collapsed ? "w-20 items-center" : "w-64 items-stretch"
      }`}
    >
      <Link
        href="/"
        aria-label="RankFTV"
        title="RankFTV"
        className={`flex shrink-0 items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
          collapsed ? "justify-center" : "gap-2.5 px-1"
        }`}
      >
        <span className="rankftv-desktop-sidebar__logo flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-black tracking-tight shadow-soft shadow-black/30">
          FTV
        </span>
        {!collapsed && (
          <span className="text-lg font-black tracking-tight text-white">
            Rank<span className="text-blue-500">FTV</span>
          </span>
        )}
      </Link>

      <div className={`relative mt-6 flex shrink-0 ${collapsed ? "justify-center" : "w-full"}`}>
        <button
          ref={quickMenuButtonRef}
          type="button"
          onClick={() => setQuickMenuOpen((open) => !open)}
          aria-label="Criar ou adicionar"
          aria-expanded={quickMenuOpen}
          aria-haspopup="menu"
          title="Criar ou adicionar"
          className={rowClass("bg-zinc-950 text-white ring-1 ring-zinc-800 hover:bg-zinc-900 hover:!text-white hover:ring-blue-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500")}
        >
          <Plus className="size-5 shrink-0" strokeWidth={2.4} />
          {!collapsed && <span className="truncate text-sm font-medium">Criar</span>}
        </button>

        <FloatingMenu
          open={quickMenuOpen}
          onClose={() => setQuickMenuOpen(false)}
          anchorRef={quickMenuButtonRef}
          placement="right-start"
          gap={12}
          role="menu"
          aria-label="Acoes rapidas"
          className="w-64 overflow-hidden rounded-card-lg bg-surface p-2 shadow-elevated ring-1 ring-border"
        >
          <Link
            href={criarCampeonatoHref(perms.isLoggedIn)}
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
            href={cadastrarArenaHref(perms.isLoggedIn)}
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
        </FloatingMenu>
      </div>

      <nav
        ref={navRef}
        aria-label="Navegacao principal"
        tabIndex={0}
        onScroll={() => setNavTooltip(null)}
        className="rankftv-desktop-sidebar__nav-scroll relative mt-6 flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
      >
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
            <div
              key={group.label}
              className={`flex w-full shrink-0 flex-col ${collapsed ? "items-center" : "items-stretch"} ${
                index > 0 ? "rankftv-desktop-sidebar__divider mt-4 border-t border-zinc-800 pt-4" : ""
              }`}
            >
              <ul className={`flex w-full flex-col gap-1 ${collapsed ? "items-center" : "items-stretch"}`}>
                {groupItems.map((item) => {
                  const active = isAppNavItemActive(pathname, item);
                  const Icon = item.icon;

                  return (
                    <li key={item.key} className={`flex w-full ${collapsed ? "justify-center" : ""}`}>
                      <Link
                        ref={setItemRef(item.key)}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={(event) => showNavTooltip(item.label, event.currentTarget)}
                        onMouseLeave={() => setNavTooltip(null)}
                        onFocus={(event) => showNavTooltip(item.label, event.currentTarget)}
                        onBlur={() => setNavTooltip(null)}
                        className={`${rowClass(
                          active
                            ? `${indicator.ready ? "" : "bg-blue-600 shadow-soft shadow-blue-600/20"} text-white`
                            : "text-zinc-200 hover:bg-zinc-900 hover:!text-white",
                        )} z-10`}
                      >
                        <Icon className="size-5 shrink-0 transition-colors duration-200" strokeWidth={2} />
                        {!collapsed && <span className="truncate text-sm font-medium">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {collapsed && navTooltip && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed left-[5.75rem] z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
          style={{ top: navTooltip.top }}
        >
          {navTooltip.label}
        </span>
      )}

      <div className={`rankftv-desktop-sidebar__divider flex shrink-0 flex-col gap-2 border-t border-zinc-800 pt-4 ${collapsed ? "items-center" : "items-stretch"}`}>
        {perms.isLoggedIn && (
          <div className={`relative ${collapsed ? "" : "w-full"}`} ref={notificationMenuRef}>
            <button
              type="button"
              onClick={() => setNotificationMenuOpen((open) => !open)}
              aria-label={notifCount > 0 ? `${notifCount} notificacoes pendentes` : "Notificacoes"}
              aria-expanded={notificationMenuOpen}
              aria-haspopup="menu"
              title={collapsed ? "Notificacoes" : undefined}
              className={rowClass("text-zinc-200 hover:bg-zinc-900 hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500")}
            >
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                <Bell className="size-5" />
                {notifCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </span>
              {!collapsed && <span className="truncate text-sm font-medium">Notificações</span>}
            </button>

            {notificationMenuOpen && (
              <div
                role="menu"
                aria-label="Ultimas notificacoes"
                className="absolute bottom-0 left-full z-50 ml-3 w-96 overflow-hidden rounded-card-lg bg-surface shadow-elevated ring-1 ring-border"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Notificacoes</p>
                    <p className="text-xs text-ink-muted">
                      {notifCount > 0 ? `${notifCount} pendente${notifCount === 1 ? "" : "s"}` : "Tudo em dia"}
                    </p>
                  </div>
                  <Link
                    href="/notificacoes"
                    role="menuitem"
                    onClick={() => setNotificationMenuOpen(false)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Ver todas
                  </Link>
                </div>

                <div className="max-h-[360px] overflow-y-auto p-2">
                  {notificationsLoading ? (
                    <div className="space-y-2 p-2">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-16 animate-pulse rounded-xl bg-surface-2" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                      <Bell className="size-8 text-ink-subtle" />
                      <p className="text-sm font-semibold text-ink">Nenhuma notificacao nova</p>
                      <p className="text-xs text-ink-muted">Quando chegar algo importante, aparece aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((item) => (
                        <NotificationPreviewItem
                          key={item.id}
                          item={item}
                          onNavigate={() => setNotificationMenuOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-2">
                  <Link
                    href="/notificacoes"
                    role="menuitem"
                    onClick={() => setNotificationMenuOpen(false)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Ver todas <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {user ? (
          <div className={`relative ${collapsed ? "" : "w-full"}`} ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label={`Menu da conta de ${user.nome}`}
              title={collapsed ? user.nome : undefined}
              className={rowClass("text-zinc-200 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500")}
            >
              <span className="shrink-0">
                <Avatar nome={user.nome} color="bg-blue-600" size="sm" fotoUrl={user.fotoUrl} />
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-white">{user.nome}</span>
                  <span className="block truncate text-xs text-zinc-400">@{user.username}</span>
                </span>
              )}
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
              title={collapsed ? "Entrar" : undefined}
              aria-label="Entrar"
              className={rowClass("text-zinc-200 hover:bg-zinc-900 hover:!text-white")}
            >
              <LogIn className="size-5 shrink-0" />
              {!collapsed && <span className="truncate text-sm font-medium">Entrar</span>}
            </Link>
            <Link
              href="/cadastro"
              title={collapsed ? "Cadastrar" : undefined}
              aria-label="Cadastrar"
              className={rowClass("bg-blue-600 text-white hover:bg-blue-500 hover:!text-white")}
            >
              <UserPlus className="size-5 shrink-0" />
              {!collapsed && <span className="truncate text-sm font-medium">Criar conta</span>}
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={rowClass("text-zinc-200 hover:bg-zinc-900 hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500")}
        >
          {collapsed ? (
            <ChevronsRight className="size-4 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="size-4 shrink-0" />
              <span className="truncate text-sm font-medium">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function NotificationPreviewItem({
  item,
  onNavigate,
}: {
  item: NotificationPreview;
  onNavigate: () => void;
}) {
  const Icon = item.kind === "staff" ? ShieldCheck : item.kind === "team" ? Users : Link2;

  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
    >
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${item.unread ? "bg-blue-100 text-blue-600" : "bg-surface-2 text-ink-muted"}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="line-clamp-1 text-sm font-semibold text-ink">{item.title}</span>
          {item.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" />}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-muted">{item.description}</span>
      </span>
    </Link>
  );
}
