"use client";

import { usePathname } from "next/navigation";
import { isFocusedRoute, type AppNavPermissions } from "@/components/shell/app-nav-items";
import { DesktopSidebar, type SidebarUser } from "@/components/shell/DesktopSidebar";
import { FocusedLayout } from "@/components/shell/FocusedLayout";

// Orquestra o shell desktop do site. Rotas focadas seguem limpas; o restante
// compartilha a mesma barra lateral para a navegacao parecer um painel unico.
export function AppShell({
  user,
  perms,
  notifCount,
  initialSidebarCollapsed,
  children,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
  notifCount: number;
  initialSidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isFocusedRoute(pathname)) return <FocusedLayout>{children}</FocusedLayout>;

  return (
    <div className="min-h-screen flex-1 bg-app-bg pb-28 md:flex md:pb-0">
      <DesktopSidebar user={user} perms={perms} notifCount={notifCount} initialCollapsed={initialSidebarCollapsed} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
