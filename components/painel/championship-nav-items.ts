import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Pencil,
  QrCode,
  Trophy,
  Shirt,
  Wallet,
  ReceiptText,
  TicketPercent,
  Layers,
  Users,
  MessageSquare,
  ListPlus,
  Grid2X2,
  FileDown,
  Armchair,
  ListChecks,
  BadgeDollarSign,
} from "lucide-react";

export type ChampionshipNavItem = {
  key: string;
  label: string;
  description?: string;
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
      {
        key: "overview",
        label: "Visão geral",
        description: "Pulso do evento, ocupação e radar operacional",
        icon: LayoutDashboard,
        href: (id) => `/painel/campeonatos/${id}`,
        matchExact: true,
      },
      {
        key: "editar",
        label: "Editar campeonato",
        description: "Dados, banner, categorias, datas e regras",
        icon: Pencil,
        href: (id) => `/painel/campeonatos/${id}/editar`,
      },
    ],
  },
  {
    label: "Atletas",
    items: [
      {
        key: "checkin",
        label: "Inscrições & Check-in",
        description: "Leitor QR, portaria e lista de duplas",
        icon: QrCode,
        href: (id) => `/painel/campeonatos/${id}/checkin`,
      },
      {
        key: "chaveamento",
        label: "Chaveamento",
        description: "Sorteio de grupos, mata-mata e partidas",
        icon: Trophy,
        href: (id) => `/painel/campeonatos/${id}/chaveamento`,
      },
      {
        key: "quadras",
        label: "Operação por quadra",
        description: "Quadro ao vivo das quadras e fila de jogos",
        icon: Grid2X2,
        href: (id) => `/painel/campeonatos/${id}/quadras`,
      },
      {
        key: "camisas",
        label: "Camisas / Kit",
        description: "Grade de tamanhos e controle de entregas",
        icon: Shirt,
        href: (id) => `/painel/campeonatos/${id}/camisas`,
      },
      {
        key: "lista-espera",
        label: "Lista de espera",
        description: "Fila ordenada FIFO e convite de vagas",
        icon: ListPlus,
        href: (id) => `/painel/campeonatos/${id}/lista-espera`,
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        key: "financeiro",
        label: "Financeiro",
        description: "Central única: DRE, carteira, saques e saúde",
        icon: Wallet,
        href: (id) => `/painel/campeonatos/${id}/financeiro`,
      },
      {
        key: "despesas",
        label: "Despesas",
        description: "Custos operacionais e alertas de vencimento",
        icon: ReceiptText,
        href: (id) => `/painel/campeonatos/${id}/despesas`,
      },
      {
        key: "cupons",
        label: "Cupons",
        description: "Códigos promocionais e limite de uso",
        icon: TicketPercent,
        href: (id) => `/painel/campeonatos/${id}/cupons`,
      },
      {
        key: "lotes",
        label: "Lotes",
        description: "Viradas automáticas de preço por data ou vaga",
        icon: Layers,
        href: (id) => `/painel/campeonatos/${id}/lotes`,
      },
      {
        key: "relatorios",
        label: "Relatórios",
        description: "Exportação CSV e PDF com filtros por período",
        icon: FileDown,
        href: (id) => `/painel/campeonatos/${id}/relatorios`,
      },
    ],
  },
  {
    label: "Equipe",
    items: [
      {
        key: "equipe",
        label: "Equipe",
        description: "Mesários, check-in e permissões do staff",
        icon: Users,
        href: (id) => `/painel/campeonatos/${id}/equipe`,
      },
      {
        key: "comunicacao",
        label: "Comunicação",
        description: "Avisos em massa segmentados aos atletas",
        icon: MessageSquare,
        href: (id) => `/painel/campeonatos/${id}/comunicacao`,
      },
    ],
  },
  {
    label: "Espectadores",
    items: [
      {
        key: "plateia",
        label: "Ingressos de plateia",
        description: "Setores, lotes e capacidade do público",
        icon: Armchair,
        href: (id) => `/painel/campeonatos/${id}/plateia`,
        matchExact: true,
      },
      {
        key: "plateia-lista",
        label: "Lista da plateia",
        description: "Check-in de entrada e conferência de ingressos",
        icon: ListChecks,
        href: (id) => `/painel/campeonatos/${id}/plateia/lista`,
      },
      {
        key: "plateia-financeiro",
        label: "Financeiro da plateia",
        description: "Bilheteria, taxas e repasses de espectadores",
        icon: BadgeDollarSign,
        href: (id) => `/painel/campeonatos/${id}/plateia/financeiro`,
      },
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
