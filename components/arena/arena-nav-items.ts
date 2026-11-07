import type { LucideIcon } from "lucide-react";
import {
  Home,
  CalendarDays,
  Users,
  Tag,
  Clock,
  BarChart3,
  Settings2,
  Sparkles,
  LayoutGrid,
  DollarSign,
  Target,
  Trophy,
} from "lucide-react";

export type ArenaNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (handle: string) => string;
  matchExact?: boolean;
  requiresPro?: boolean;
  badge?: string;
};

export type ArenaNavGroup = { label: string; items: ArenaNavItem[] };

export const ARENA_NAV_GROUPS: ArenaNavGroup[] = [
  {
    label: "Operação",
    items: [
      { key: "inicio", label: "Início", icon: Home, href: (h) => `/arena/${h}`, matchExact: true },
      { key: "agenda", label: "Agenda & Chamada", icon: CalendarDays, href: (h) => `/arena/${h}/agenda` },
      { key: "aulas", label: "Aulas e Horários", icon: Clock, href: (h) => `/arena/${h}/aulas` },
      { key: "quadras", label: "Quadras", icon: LayoutGrid, href: (h) => `/arena/${h}/quadras` },
    ],
  },
  {
    label: "Alunos",
    items: [
      { key: "alunos", label: "Alunos", icon: Users, href: (h) => `/arena/${h}/alunos` },
      { key: "planos", label: "Planos de Mensalidade", icon: Tag, href: (h) => `/arena/${h}/planos` },
      {
        key: "radar-evasao",
        label: "Radar Anti-Evasão",
        icon: Target,
        href: (h) => `/arena/${h}/radar-evasao`,
        requiresPro: true,
        badge: "PRO",
      },
    ],
  },
  {
    label: "Financeiro & Negócio",
    items: [
      {
        key: "relatorios",
        label: "Financeiro & DRE",
        icon: BarChart3,
        href: (h) => `/arena/${h}/relatorios`,
      },
      {
        key: "torneios",
        label: "Torneios Internos",
        icon: Trophy,
        href: (h) => `/arena/${h}/torneios`,
        requiresPro: true,
        badge: "PRO",
      },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { key: "assinatura", label: "Meu Plano & Limites", icon: Sparkles, href: (h) => `/arena/${h}/assinatura` },
      { key: "configuracoes", label: "Configurações", icon: Settings2, href: (h) => `/arena/${h}/configuracoes` },
    ],
  },
];

export function isArenaNavItemActive(pathname: string, href: string, matchExact?: boolean): boolean {
  if (matchExact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Título contextual da página, derivado da rota ativa.
export function arenaPageTitle(pathname: string, handle: string): string {
  for (const group of ARENA_NAV_GROUPS) {
    for (const item of group.items) {
      if (isArenaNavItemActive(pathname, item.href(handle), item.matchExact)) return item.label;
    }
  }
  if (pathname.includes("/aula/")) return "Aula";
  return "Painel";
}
