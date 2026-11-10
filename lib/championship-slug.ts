export const DEMO_CHAMPIONSHIP_ID = "c1000000-0000-4000-8000-000000000001";
export const DEMO_CHAMPIONSHIP_SLUG = "circuito-rankftv-open-pro-2026";
export const CEO_USER_ID = "f58de881-3c02-4748-847c-d4d945e527a8";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function slugifyChampionshipName(nome: string): string {
  const slug = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "campeonato";
}

export function getChampionshipSlug(championship: {
  id: string;
  nome: string;
  slug?: string | null;
}): string {
  if (championship.slug) return championship.slug;
  if (championship.id === DEMO_CHAMPIONSHIP_ID) return DEMO_CHAMPIONSHIP_SLUG;
  return slugifyChampionshipName(championship.nome);
}

export function isDemoChampionship(idOrSlug: string): boolean {
  const normalized = idOrSlug.trim().toLowerCase();
  return normalized === DEMO_CHAMPIONSHIP_ID || normalized === DEMO_CHAMPIONSHIP_SLUG;
}
