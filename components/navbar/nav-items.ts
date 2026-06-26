import { Building2, LayoutDashboard, Trophy } from "lucide-react";
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
];

// "/" (Campeonatos) fica ativo também em /campeonatos/* (detalhe do camp).
export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/campeonatos");
  return pathname.startsWith(href);
}
