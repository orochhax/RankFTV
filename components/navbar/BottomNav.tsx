"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

// Navbar flutuante de baixo, só no mobile (escondida no desktop via `md:hidden`).
// A aba ativa vira uma cápsula azul com ícone + texto; as outras ficam só com ícone.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-1.5 pb-4 md:hidden">
      {/* Logo discreta acima da pill de navegação */}
      <Link href="/" className="text-[10px] font-bold tracking-widest text-gray-400/60 hover:text-gray-400 transition-colors select-none">
        Rank<span className="text-blue-500/70">FTV</span>
      </Link>

    <nav
      aria-label="Navegação principal"
      className="flex justify-center"
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
    </div>
  );
}
