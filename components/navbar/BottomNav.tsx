"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

// Navbar flutuante de baixo, só no mobile (escondida no desktop via `md:hidden`).
// A aba ativa vira uma cápsula azul com ícone + texto; as outras ficam só com ícone.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center md:hidden"
    >
      <ul className="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-lg shadow-black/10 ring-1 ring-black/5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon className="size-5" strokeWidth={2} />
                {active && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
