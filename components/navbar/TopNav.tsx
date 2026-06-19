"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Settings, ShieldCheck, Wrench } from "lucide-react";
import { isNavItemActive, NAV_ITEMS, type NavItem } from "./nav-items";
import { createClient } from "@/lib/supabase/client";

type NavUser = { id: string; nome: string; username: string };

export function TopNav({
  user,
  showStaff = false,
  isAdmin = false,
  notifCount = 0,
}: {
  user: NavUser | null;
  showStaff?: boolean;
  isAdmin?: boolean;
  notifCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = showStaff
    ? [...NAV_ITEMS, { href: "/staff", label: "Staff", icon: ShieldCheck }]
    : NAV_ITEMS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 hidden border-b border-black/5 bg-white/80 backdrop-blur md:block">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6"
      >
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          Rank<span className="text-blue-600">FTV</span>
        </Link>

        <div className="flex items-center gap-1">
          <ul className="flex items-center gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = isNavItemActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="size-4" strokeWidth={2} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-2 flex items-center gap-1 border-l border-gray-200 pl-3">
            {isAdmin && (
              <Link
                href="/admin/taxas"
                aria-label="Painel admin"
                title="Taxas da plataforma"
                className="rounded-full p-2 text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                <Wrench className="size-5" />
              </Link>
            )}
            {user && (
              <Link
                href="/notificacoes"
                aria-label="Notificações"
                className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Bell className="size-5" />
                {notifCount > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/perfil"
              aria-label="Configurações / Perfil"
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Settings className="size-5" />
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                Sair
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
