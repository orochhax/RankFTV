"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Link2, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { arenaPageTitle } from "@/components/arena/arena-nav-items";
import { APP_NAV_ITEMS, isAppNavItemActive } from "@/components/shell/app-nav-items";

type NotificationPreview = {
  id: string;
  title: string;
  description: string;
  href: string;
  unread: boolean;
  kind: "staff" | "team" | "notice";
};

function currentPageTitle(pathname: string): string {
  const arenaHandle = pathname.match(/^\/arena\/([^/]+)/)?.[1];
  if (arenaHandle) return arenaPageTitle(pathname, arenaHandle);

  for (const item of APP_NAV_ITEMS) {
    if (isAppNavItemActive(pathname, item)) return item.label;
  }
  return "RankFTV";
}

export function DesktopTopbar({
  isLoggedIn,
  notifCount,
}: {
  isLoggedIn: boolean;
  notifCount: number;
}) {
  const pathname = usePathname();
  const title = currentPageTitle(pathname);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<NotificationPreview[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded || loading) return;

    async function loadNotifications() {
      setLoading(true);
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setItems([]);
        setLoaded(true);
        setLoading(false);
        return;
      }

      const [staffRes, teamRes, noticeRes] = await Promise.all([
        supabase
          .from("championship_staff")
          .select("id, created_at, championships(id, nome)")
          .eq("user_id", user.id)
          .eq("status", "pendente")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("teams")
          .select("id, created_at, championship_id, championships(nome), championship_categories(nome)")
          .eq("atleta2_id", user.id)
          .eq("status", "convite_pendente")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("notifications")
          .select("id, tipo, titulo, mensagem, lida, championship_id, created_at")
          .eq("user_id", user.id)
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

      const nextItems = [...staffItems, ...teamItems, ...noticeItems]
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

      setItems(nextItems);
      setLoaded(true);
      setLoading(false);
    }

    void loadNotifications();
  }, [loaded, loading, open]);

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur md:flex">
      <h1 className="text-base font-bold text-ink">{title}</h1>
      {isLoggedIn && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={notifCount > 0 ? `${notifCount} notificacoes pendentes` : "Notificacoes"}
            aria-expanded={open}
            aria-haspopup="menu"
            className="relative flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="size-5" />
            {notifCount > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {open && (
            <div
              role="menu"
              aria-label="Ultimas notificacoes"
              className="absolute right-0 top-full z-50 mt-3 w-96 overflow-hidden rounded-card-lg bg-surface shadow-elevated ring-1 ring-border"
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
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ver todas
                </Link>
              </div>

              <div className="max-h-[360px] overflow-y-auto p-2">
                {loading ? (
                  <div className="space-y-2 p-2">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded-xl bg-surface-2" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <Bell className="size-8 text-ink-subtle" />
                    <p className="text-sm font-semibold text-ink">Nenhuma notificacao nova</p>
                    <p className="text-xs text-ink-muted">Quando chegar algo importante, aparece aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((item) => (
                      <NotificationPreviewItem key={item.id} item={item} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border p-2">
                <Link
                  href="/notificacoes"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Ver todas <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
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
