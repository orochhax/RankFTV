import type { LucideIcon } from "lucide-react";
import {
  Trophy, Building2, CalendarDays, Ticket, ClipboardList, User,
  LayoutDashboard, ShieldCheck, Wrench,
} from "lucide-react";

export type AppNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  matchExact?: boolean;
  /** Se ausente, o item é público. */
  requires?: "auth" | "organizer" | "arenaOwner" | "staff" | "admin";
};

// Itens sempre visíveis (públicos) + condicionais por permissão. Nada aqui é
// link morto: cada href corresponde a uma rota real e existente.
export const APP_NAV_ITEMS: AppNavItem[] = [
  { key: "campeonatos", label: "Campeonatos", href: "/", icon: Trophy, matchExact: true },
  { key: "arenas", label: "Arenas", href: "/arenas", icon: Building2 },
  { key: "agenda", label: "Agenda", href: "/agenda", icon: CalendarDays },
  { key: "ingressos", label: "Meus ingressos", href: "/meus-ingressos", icon: Ticket },
  { key: "inscricoes", label: "Minhas inscrições", href: "/minhas-inscricoes", icon: ClipboardList, requires: "auth" },
  { key: "perfil", label: "Perfil", href: "/perfil", icon: User, requires: "auth" },
  { key: "painel", label: "Organizador", href: "/painel", icon: LayoutDashboard, requires: "organizer" },
  { key: "arena", label: "Minhas arenas", href: "/arena", icon: Building2, requires: "arenaOwner" },
  { key: "staff", label: "Staff", href: "/staff", icon: ShieldCheck, requires: "staff" },
  { key: "admin", label: "Administração", href: "/admin", icon: Wrench, requires: "admin" },
];

export type AppNavPermissions = {
  isLoggedIn: boolean;
  isOrganizer: boolean;
  isArenaOwner: boolean;
  isStaff: boolean;
  isAdmin: boolean;
};

export function visibleAppNavItems(perms: AppNavPermissions): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => {
    switch (item.requires) {
      case undefined:  return true;
      case "auth":     return perms.isLoggedIn;
      case "organizer":return perms.isOrganizer;
      case "arenaOwner":return perms.isArenaOwner;
      case "staff":    return perms.isStaff;
      case "admin":    return perms.isAdmin;
      default:         return false;
    }
  });
}

export function isAppNavItemActive(pathname: string, item: AppNavItem): boolean {
  if (item.matchExact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Rotas que precisam de experiência concentrada (sem sidebar/topbar/bottom
// nav) — autenticação, pagamento, convites, termos. Prefixo = tudo abaixo
// também entra.
const FOCUSED_PREFIXES = [
  "/login",
  "/cadastro",
  "/convite",
  "/termos",
  "/arena/mensalidade", // Pix da mensalidade do aluno — página avulsa
];

// Padrões de pagamento/checkout/inscrição que vivem dentro de segmentos
// dinâmicos ([id]) de campeonato — casados por substring. Cada um foi
// conferido contra o inventário de rotas pra não colidir com /painel ou
// /staff (que usam "inscricoes", não "inscrever", por exemplo).
const FOCUSED_SUBSTRINGS = [
  "/pagamento/",
  "/comprar/ingresso/",
  "/plateia/ingresso/",
  "/reembolso",
  "/inscrever",
];

export function isFocusedRoute(pathname: string): boolean {
  if (FOCUSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return FOCUSED_SUBSTRINGS.some((s) => pathname.includes(s));
}
