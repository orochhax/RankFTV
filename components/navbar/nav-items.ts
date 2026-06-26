import { Building2, CalendarDays, Home, LayoutDashboard, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Estrutura do site: Home, Campeonatos, Arenas, Painel.
// Rank saiu do menu principal (ainda acessível via /rank mas sem destaque na nav).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/campeonatos", label: "Campeonatos", icon: Trophy },
  { href: "/arenas", label: "Arenas", icon: Building2 },
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
];

// "/" só fica ativo na própria Home; os outros itens ficam ativos também
// em sub-rotas (ex.: /campeonatos/123 mantém "Campeonatos" ativo).
export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
