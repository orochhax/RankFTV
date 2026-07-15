import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Pencil, ClipboardList, QrCode, Trophy, Shirt,
  Wallet, TicketPercent, Layers, Users, MessageSquare,
  Armchair, ListChecks, BadgeDollarSign, ScanLine,
} from "lucide-react";

export type ChampionshipNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (id: string) => string;
  matchExact?: boolean;
};

export type ChampionshipNavGroup = {
  label: string;
  items: ChampionshipNavItem[];
};

// Navegação contextual do painel de um campeonato específico — cada href é
// relativo a /painel/campeonatos/[id]. Espelha a estrutura pedida: Principal,
// Atletas, Financeiro, Equipe, Espectadores. "Outros" (voltar, ver pública)
// fica fora daqui porque não é uma seção de gestão, é navegação de saída.
export const CHAMPIONSHIP_NAV_GROUPS: ChampionshipNavGroup[] = [
  {
    label: "Principal",
    items: [
      { key: "overview", label: "Visão geral", icon: LayoutDashboard, href: (id) => `/painel/campeonatos/${id}`, matchExact: true },
      { key: "editar", label: "Editar campeonato", icon: Pencil, href: (id) => `/painel/campeonatos/${id}/editar` },
    ],
  },
  {
    label: "Atletas",
    items: [
      { key: "inscricoes", label: "Inscrições", icon: ClipboardList, href: (id) => `/painel/campeonatos/${id}/inscricoes` },
      { key: "checkin", label: "Check-in", icon: QrCode, href: (id) => `/painel/campeonatos/${id}/checkin` },
      { key: "chaveamento", label: "Chaveamento", icon: Trophy, href: (id) => `/painel/campeonatos/${id}/chaveamento` },
      { key: "camisas", label: "Camisas / Kit", icon: Shirt, href: (id) => `/painel/campeonatos/${id}/camisas` },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { key: "financeiro", label: "Financeiro", icon: Wallet, href: (id) => `/painel/campeonatos/${id}/financeiro` },
      { key: "cupons", label: "Cupons", icon: TicketPercent, href: (id) => `/painel/campeonatos/${id}/cupons` },
      { key: "lotes", label: "Lotes", icon: Layers, href: (id) => `/painel/campeonatos/${id}/lotes` },
    ],
  },
  {
    label: "Equipe",
    items: [
      { key: "equipe", label: "Equipe", icon: Users, href: (id) => `/painel/campeonatos/${id}/equipe` },
      { key: "comunicacao", label: "Comunicação", icon: MessageSquare, href: (id) => `/painel/campeonatos/${id}/comunicacao` },
    ],
  },
  {
    label: "Espectadores",
    items: [
      { key: "plateia", label: "Ingressos de plateia", icon: Armchair, href: (id) => `/painel/campeonatos/${id}/plateia`, matchExact: true },
      { key: "plateia-lista", label: "Lista da plateia", icon: ListChecks, href: (id) => `/painel/campeonatos/${id}/plateia/lista` },
      { key: "plateia-financeiro", label: "Financeiro da plateia", icon: BadgeDollarSign, href: (id) => `/painel/campeonatos/${id}/plateia/financeiro` },
      { key: "plateia-checkin", label: "Check-in da plateia", icon: ScanLine, href: (id) => `/painel/campeonatos/${id}/plateia/checkin` },
    ],
  },
];

// Lista achatada — usada só pra achar o título da seção ativa (breadcrumb) e
// destacar o item certo no menu "Gerenciar".
export const CHAMPIONSHIP_NAV_FLAT: ChampionshipNavItem[] = CHAMPIONSHIP_NAV_GROUPS.flatMap((g) => g.items);

export function isChampionshipNavItemActive(pathname: string, href: string, matchExact?: boolean): boolean {
  if (matchExact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Título de página derivado da rota ativa — usado no cabeçalho contextual
// quando a página em si não repete o nome da seção. `undefined` quando a
// rota não é uma das seções de gestão (ex.: /criado, /publicar — fluxo de
// onboarding, fora da navegação contextual).
export function championshipPageTitle(pathname: string, id: string): string | undefined {
  const item = CHAMPIONSHIP_NAV_FLAT.find((i) => isChampionshipNavItemActive(pathname, i.href(id), i.matchExact));
  return item?.label;
}
