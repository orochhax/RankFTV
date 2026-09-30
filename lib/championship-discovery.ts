import type { Championship } from "@/lib/types";

export type ChampionshipDiscoveryFilters = {
  query: string;
  location: string;
  state: string;
  dateFrom: string;
  dateTo: string;
  category: string;
  maxPrice: string;
  openOnly: boolean;
};

export const EMPTY_DISCOVERY_FILTERS: ChampionshipDiscoveryFilters = {
  query: "",
  location: "",
  state: "",
  dateFrom: "",
  dateTo: "",
  category: "",
  maxPrice: "",
  openOnly: false,
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function clean(value: string | string[] | undefined, maxLength = 80) {
  return first(value).trim().slice(0, maxLength);
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function parseDiscoveryFilters(input: Record<string, string | string[] | undefined>) {
  const maxPrice = clean(input.preco, 8);
  return {
    query: clean(input.busca),
    location: clean(input.local),
    state: clean(input.uf, 2).toUpperCase(),
    dateFrom: validDate(clean(input.de, 10)),
    dateTo: validDate(clean(input.ate, 10)),
    category: clean(input.categoria),
    maxPrice: /^\d{1,6}$/.test(maxPrice) ? maxPrice : "",
    openOnly: first(input.abertos) === "1",
  } satisfies ChampionshipDiscoveryFilters;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function lowestChampionshipPrice(championship: Championship) {
  const prices = championship.categorias.map((category) => category.valorInscricao).filter(Number.isFinite);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function filterChampionships(
  championships: Championship[],
  filters: ChampionshipDiscoveryFilters,
) {
  const query = normalized(filters.query);
  const location = normalized(filters.location);
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;

  return championships.filter((championship) => {
    if (query && !normalized(championship.nome).includes(query)) return false;
    if (location && !normalized(`${championship.local} ${championship.cidade} ${championship.estado}`).includes(location)) return false;
    if (filters.state && championship.estado !== filters.state) return false;
    if (filters.dateFrom && championship.dataFim < filters.dateFrom) return false;
    if (filters.dateTo && championship.dataInicio > filters.dateTo) return false;
    if (filters.category && !championship.categorias.some((category) => category.nome === filters.category)) return false;
    if (filters.openOnly && !["inscricoes_abertas", "em_andamento"].includes(championship.status)) return false;
    const lowestPrice = lowestChampionshipPrice(championship);
    if (maxPrice !== null && (lowestPrice === null || lowestPrice > maxPrice)) return false;
    return true;
  });
}

export function discoveryFiltersToQuery(filters: ChampionshipDiscoveryFilters) {
  const query = new URLSearchParams();
  if (filters.query) query.set("busca", filters.query);
  if (filters.location) query.set("local", filters.location);
  if (filters.state) query.set("uf", filters.state);
  if (filters.dateFrom) query.set("de", filters.dateFrom);
  if (filters.dateTo) query.set("ate", filters.dateTo);
  if (filters.category) query.set("categoria", filters.category);
  if (filters.maxPrice) query.set("preco", filters.maxPrice);
  if (filters.openOnly) query.set("abertos", "1");
  return query.toString();
}
