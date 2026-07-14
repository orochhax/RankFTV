"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { isArenaOrganizerRoute } from "@/components/navbar/nav-items";
import { isFocusedRoute, type AppNavPermissions } from "@/components/shell/app-nav-items";
import { DesktopSidebar, type SidebarUser } from "@/components/shell/DesktopSidebar";
import { DesktopTopbar } from "@/components/shell/DesktopTopbar";
import { FocusedLayout } from "@/components/shell/FocusedLayout";

const COLLAPSE_COOKIE = "sidebar_collapsed";

// Orquestra o shell desktop pro resto do site. Não decide nada por conta
// própria fora de layout: autenticação/permissões vêm prontas do layout raiz
// (Server Component), e este componente só decide QUAL casca mostrar a
// partir da rota atual:
//  - painel da arena (/arena/[handle]/...) -> passthrough, o ArenaShell já
//    resolve a própria navegação;
//  - rotas focadas (login, pagamento, convite...) -> FocusedLayout;
//  - resto -> sidebar + topbar desktop (mobile continua com a BottomNav
//    global, renderizada à parte no layout raiz).
export function AppShell({
  user,
  perms,
  notifCount,
  initialCollapsed,
  children,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
  notifCount: number;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  if (isArenaOrganizerRoute(pathname)) return <>{children}</>;
  if (isFocusedRoute(pathname)) return <FocusedLayout>{children}</FocusedLayout>;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="min-h-screen flex-1 pb-28 md:flex md:bg-app-bg md:pb-0">
      <DesktopSidebar user={user} perms={perms} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className="min-w-0 flex-1">
        <DesktopTopbar isLoggedIn={perms.isLoggedIn} notifCount={notifCount} />
        {children}
      </div>
    </div>
  );
}
