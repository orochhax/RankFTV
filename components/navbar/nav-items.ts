import { Building2, LayoutDashboard, ShoppingBag, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requires?: "auth" | "organizer";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Campeonatos", icon: Trophy },
  { href: "/arenas", label: "Arenas", icon: Building2 },
  { href: "/painel", label: "Painel", icon: LayoutDashboard, requires: "organizer" },
  { href: "/minhas-compras", label: "Minhas compras", icon: ShoppingBag, requires: "auth" },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function visibleBottomNavItems({
  isLoggedIn,
  isOrganizer,
}: {
  isLoggedIn: boolean;
  isOrganizer: boolean;
}): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requires === "auth") return isLoggedIn;
    if (item.requires === "organizer") return isOrganizer;
    return true;
  });
}

// "/" (Campeonatos) fica ativo também em /campeonatos/* (detalhe do camp).
export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/campeonatos");
  return pathname.startsWith(href);
}

// O painel da arena (/arena/...) usa subnavegação contextual no desktop e
// drawer próprio no mobile. Por isso a BottomNav mobile não deve ser
// duplicada nessas rotas. As páginas do ATLETA (presença e mensalidade)
// continuam com a navegação global normal.
const ARENA_ATLETA_PREFIXES = ["/arena/presenca", "/arena/mensalidade"];

export function isArenaOrganizerRoute(pathname: string): boolean {
  if (pathname !== "/arena" && !pathname.startsWith("/arena/")) return false;
  return !ARENA_ATLETA_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
