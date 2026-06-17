import { BarChart3, CalendarDays, Home, LayoutDashboard, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Estrutura do site: Home, Agenda, Campeonatos, Rank (ver ftv.md, seção 8.1).
// Perfil é acessado via ícone de engrenagem no canto superior da Home.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/campeonatos", label: "Campeonatos", icon: Trophy },
  { href: "/rank", label: "Rank", icon: BarChart3 },
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
];

// "/" só fica ativo na própria Home; os outros itens ficam ativos também
// em sub-rotas (ex.: /campeonatos/123 mantém "Campeonatos" ativo).
export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
