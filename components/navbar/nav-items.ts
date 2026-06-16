import { BarChart3, Home, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Estrutura fixa do site: Home, Campeonatos, Rank e Perfil (ver ftv.md, seção 8.1).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/campeonatos", label: "Campeonatos", icon: Trophy },
  { href: "/rank", label: "Rank", icon: BarChart3 },
  { href: "/perfil", label: "Perfil", icon: User },
];

// "/" só fica ativo na própria Home; os outros itens ficam ativos também
// em sub-rotas (ex.: /campeonatos/123 mantém "Campeonatos" ativo).
export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
