const DARK_HEADER_ROUTES = [
  "/",
  "/para-voce",
  "/campeonatos",
  "/arenas",
  "/agenda",
  "/minhas-compras",
  "/painel",
  "/painel/campeonatos",
  "/admin/destaques",
  "/admin/gasto-mensal",
  "/admin/gasto-mensal/extrato",
  "/admin/taxas",
];

export function isDarkHeaderRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (DARK_HEADER_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith("/admin/gasto-mensal")) return true;
  return false;
}

