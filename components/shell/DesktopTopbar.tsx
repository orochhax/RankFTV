"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { APP_NAV_ITEMS, isAppNavItemActive } from "@/components/shell/app-nav-items";

function currentPageTitle(pathname: string): string {
  for (const item of APP_NAV_ITEMS) {
    if (isAppNavItemActive(pathname, item)) return item.label;
  }
  return "RankFTV";
}

// Topbar fina do shell desktop — título da página + notificações reais do
// usuário logado. Sem busca decorativa: o site não tem uma busca global
// integrada ainda, então não finge ter uma.
export function DesktopTopbar({
  isLoggedIn,
  notifCount,
}: {
  isLoggedIn: boolean;
  notifCount: number;
}) {
  const pathname = usePathname();
  const title = currentPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur md:flex">
      <h1 className="text-base font-bold text-ink">{title}</h1>
      {isLoggedIn && (
        <Link
          href="/notificacoes"
          aria-label={notifCount > 0 ? `${notifCount} notificações pendentes` : "Notificações"}
          className="relative flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Bell className="size-5" />
          {notifCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </Link>
      )}
    </header>
  );
}
