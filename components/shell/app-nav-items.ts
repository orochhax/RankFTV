import type { LucideIcon } from "lucide-react";
import {
  Trophy, Building2, CalendarDays, Ticket, ShoppingBag, User,
  LayoutDashboard, ShieldCheck, Wrench,
} from "lucide-react";

export type AppNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  matchExact?: boolean;
  /** Se ausente, o item é público. */
  requires?: "guest" | "auth" | "organizer" | "arenaOwner" | "staff" | "admin";
};

// Itens sempre visíveis (públicos) + condicionais por permissão. Nada aqui é
// link morto: cada href corresponde a uma rota real e existente.
export const APP_NAV_ITEMS: AppNavItem[] = [
  { key: "campeonatos", label: "Campeonatos", href: "/", icon: Trophy, matchExact: true },
  { key: "arenas", label: "Arenas", href: "/arenas", icon: Building2 },
  { key: "agenda", label: "Agenda", href: "/agenda", icon: CalendarDays },
  { key: "consultar-ingresso", label: "Consultar ingresso", href: "/meus-ingressos", icon: Ticket, requires: "guest" },
  { key: "compras", label: "Minhas compras", href: "/minhas-compras", icon: ShoppingBag, requires: "auth" },
  { key: "perfil", label: "Perfil", href: "/perfil", icon: User, requires: "auth" },
  { key: "painel", label: "Organizador", href: "/painel", icon: LayoutDashboard, requires: "organizer" },
  { key: "arena", label: "Minhas arenas", href: "/arena", icon: Building2, requires: "arenaOwner" },
  { key: "staff", label: "Staff", href: "/staff", icon: ShieldCheck, requires: "staff" },
  { key: "admin", label: "Administração", href: "/admin", icon: Wrench, requires: "admin" },
];

export const APP_NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Principal", keys: ["campeonatos", "arenas", "agenda", "consultar-ingresso"] },
  { label: "Minha conta", keys: ["compras"] },
  { label: "Gestao", keys: ["painel", "arena", "staff", "admin"] },
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
      case "guest":    return !perms.isLoggedIn;
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
  if (item.key === "campeonatos") return pathname === "/" || pathname.startsWith("/campeonatos");
  if (item.key === "compras") {
    return pathname === "/minhas-compras"
      || pathname.startsWith("/minhas-compras/")
      || pathname === "/meus-ingressos"
      || pathname.startsWith("/meus-ingressos/")
      || pathname === "/minhas-inscricoes"
      || pathname.startsWith("/minhas-inscricoes/");
  }
  if (item.key === "arena") return pathname === "/arena" || pathname.startsWith("/arena/");
  if (item.matchExact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Somente fluxos realmente avulsos ficam sem a navegação principal. As telas
// de campeonato, checkout, ingresso e reembolso preservam o AppShell para que
// a pessoa nunca perca o atalho de Minhas compras.
const FOCUSED_PREFIXES = [
  "/login",
  "/cadastro",
  "/convite",
  "/termos",
  "/arena/mensalidade", // Pix da mensalidade do aluno — página avulsa
];

export function isFocusedRoute(pathname: string): boolean {
  return FOCUSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
