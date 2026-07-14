import { Building2, LayoutDashboard, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Campeonatos", icon: Trophy },
  { href: "/arenas", label: "Arenas", icon: Building2 },
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/perfil", label: "Perfil", icon: User },
];

// "/" (Campeonatos) fica ativo também em /campeonatos/* (detalhe do camp).
export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/campeonatos");
  return pathname.startsWith(href);
}

// Painel do organizador da arena (/arena/...) tem navegação própria (sidebar
// desktop + drawer mobile) e não deve duplicar TopNav/BottomNav/Footer
// globais. Exclui as rotas de /arena que na verdade são do ATLETA (marcar
// presença, pagar mensalidade) — essas continuam com a navegação do site.
const ARENA_ATLETA_PREFIXES = ["/arena/presenca", "/arena/mensalidade"];

export function isArenaOrganizerRoute(pathname: string): boolean {
  if (pathname !== "/arena" && !pathname.startsWith("/arena/")) return false;
  return !ARENA_ATLETA_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
