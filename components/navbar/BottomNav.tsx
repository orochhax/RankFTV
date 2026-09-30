"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShieldCheck, Wrench } from "lucide-react";
import { isArenaOrganizerRoute, isNavItemActive, visibleBottomNavItems, type NavItem } from "./nav-items";
import { isFocusedRoute } from "@/components/shell/app-nav-items";

export function BottomNav({
  showStaff = false,
  isAdmin = false,
  isOrganizer = false,
  notifCount = 0,
  isLoggedIn = false,
}: {
  showStaff?: boolean;
  isAdmin?: boolean;
  isOrganizer?: boolean;
  notifCount?: number;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();

  if (isArenaOrganizerRoute(pathname) || isFocusedRoute(pathname)) return null;

  // "Painel" depende da permissão de organizador e "Minhas compras" da
  // sessão autenticada. Os demais atalhos continuam sempre visíveis.
  const base = visibleBottomNavItems({ isLoggedIn, isOrganizer });
  const items: NavItem[] = showStaff
    ? [...base, { href: "/staff", label: "Staff", icon: ShieldCheck }]
    : base;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-1.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden bg-gradient-to-t from-white via-white/95 to-transparent pt-6">
      {/* Logo + sino acima da pill de navegação */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 select-none hover:bg-blue-500 transition-colors"
        >
          Rank <span className="font-black">FTV</span>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Painel admin"
            className="flex size-7 items-center justify-center rounded-full bg-amber-100 shadow shadow-black/10 ring-1 ring-amber-200"
          >
            <Wrench className="size-3.5 text-amber-600" />
          </Link>
        )}
        {isLoggedIn && (
          <Link
            href="/notificacoes"
            aria-label={notifCount > 0 ? `${notifCount} notificações pendentes` : "Notificações"}
            className="relative flex size-7 items-center justify-center rounded-full bg-white shadow shadow-black/10 ring-1 ring-black/5"
          >
            <Bell className="size-4 text-gray-600" />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>
        )}
      </div>

    <nav
      aria-label="Navegação principal"
      className="flex justify-center"
    >
      <ul className="flex max-w-[calc(100vw-1rem)] items-center gap-0.5 overflow-x-auto rounded-full bg-white p-1.5 shadow-lg shadow-black/10 ring-1 ring-black/5 min-[360px]:gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-2 py-2.5 text-sm font-medium transition-colors min-[360px]:px-2.5 min-[420px]:px-3 ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon className="size-5" strokeWidth={2} />
                {active && <span className="hidden min-[360px]:inline">{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </div>
  );
}
