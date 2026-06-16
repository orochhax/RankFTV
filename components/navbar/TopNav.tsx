"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

// Menu fixo no topo, só no desktop (escondido no mobile via `hidden md:block`).
// Mesmas 4 seções da BottomNav, só que em formato de menu horizontal tradicional.
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 hidden border-b border-black/5 bg-white/80 backdrop-blur md:block">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6"
      >
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          Rank<span className="text-blue-600">FTV</span>
        </Link>
        <ul className="flex items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
      </nav>
    </header>
  );
}
