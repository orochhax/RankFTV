"use client";

import { usePathname } from "next/navigation";
import { isArenaOrganizerRoute } from "@/components/navbar/nav-items";
import { isFocusedRoute, type AppNavPermissions } from "@/components/shell/app-nav-items";
import { DesktopSidebar, type SidebarUser } from "@/components/shell/DesktopSidebar";
import { DesktopTopbar } from "@/components/shell/DesktopTopbar";
import { FocusedLayout } from "@/components/shell/FocusedLayout";

// Orquestra o shell desktop do site. Rotas focadas seguem limpas e o painel
// interno da arena continua usando seu proprio shell contextual.
export function AppShell({
  user,
  perms,
  notifCount,
  children,
}: {
  user: SidebarUser;
  perms: AppNavPermissions;
  notifCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isArenaOrganizerRoute(pathname)) return <>{children}</>;
  if (isFocusedRoute(pathname)) return <FocusedLayout>{children}</FocusedLayout>;

  return (
    <div className="min-h-screen flex-1 pb-28 md:flex md:bg-app-bg md:pb-0">
      <DesktopSidebar user={user} perms={perms} />
      <div className="min-w-0 flex-1">
        <DesktopTopbar isLoggedIn={perms.isLoggedIn} notifCount={notifCount} />
        {children}
      </div>
    </div>
  );
}
