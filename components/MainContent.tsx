"use client";

import { usePathname } from "next/navigation";
import { isArenaOrganizerRoute } from "@/components/navbar/nav-items";

// O painel do organizador da arena tem navegação própria (sem BottomNav
// global), então não precisa da folga inferior reservada pra pill de
// navegação flutuante do resto do site.
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const semBottomNav = isArenaOrganizerRoute(pathname);

  return (
    <main className={`flex-1 ${semBottomNav ? "" : "pb-28 md:pb-0"}`}>
      {children}
    </main>
  );
}
