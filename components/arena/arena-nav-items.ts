import type { LucideIcon } from "lucide-react";
import { Home, CalendarDays, Users, Tag, Clock, BarChart3, CreditCard, Settings2 } from "lucide-react";

export type ArenaNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (handle: string) => string;
  matchExact?: boolean;
};

export type ArenaNavGroup = { label: string; items: ArenaNavItem[] };

// Só itens que abrem conteúdo real do RankFTV — nada de CRM/Estoque/links
// sem função, mesmo que apareçam em referências visuais de outros produtos.
export const ARENA_NAV_GROUPS: ArenaNavGroup[] = [
  {
    label: "Principal",
    items: [
      { key: "inicio", label: "Início", icon: Home, href: (h) => `/arena/${h}`, matchExact: true },
      { key: "agenda", label: "Agenda", icon: CalendarDays, href: (h) => `/arena/${h}/agenda` },
    ],
  },
  {
    label: "Gestão",
    items: [
      { key: "alunos", label: "Alunos", icon: Users, href: (h) => `/arena/${h}/alunos` },
      { key: "planos", label: "Planos para alunos", icon: Tag, href: (h) => `/arena/${h}/planos` },
      { key: "aulas", label: "Aulas e horários", icon: Clock, href: (h) => `/arena/${h}/aulas` },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { key: "relatorios", label: "Relatórios", icon: BarChart3, href: (h) => `/arena/${h}/relatorios` },
      { key: "assinatura", label: "Plano RankFTV", icon: CreditCard, href: (h) => `/arena/${h}/assinatura` },
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
