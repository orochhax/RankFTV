import assert from "node:assert/strict";
import test from "node:test";
import type { Championship } from "./types";
import { discoveryFiltersToQuery, EMPTY_DISCOVERY_FILTERS, filterChampionships, parseDiscoveryFilters } from "./championship-discovery";

function championship(overrides: Partial<Championship> = {}): Championship {
  return {
    id: "one",
    nome: "Copa Verão",
    descricao: "",
    regulamento: "",
    dataInicio: "2026-09-10",
    dataFim: "2026-09-12",
    cidade: "Salvador",
    estado: "BA",
    local: "Arena Praia",
    status: "inscricoes_abertas",
    organizadorId: "owner",
    taxaPlataforma: 0,
    bannerFrom: "from-blue-500",
    bannerTo: "to-blue-400",
    usaMotorCategoria: false,
    categorias: [{ id: "cat", nome: "Iniciante", genero: "mista", valorInscricao: 120, corteRatingMin: 0, corteRatingMax: 0 }],
    ...overrides,
  };
}

test("public discovery combines text, location, overlapping dates, category and price", () => {
  const camps = [championship(), championship({ id: "two", nome: "Open Sul", cidade: "Curitiba", estado: "PR" })];
  const result = filterChampionships(camps, {
    ...EMPTY_DISCOVERY_FILTERS,
    query: "copa verao",
    location: "arena praia",
    dateFrom: "2026-09-11",
    dateTo: "2026-09-11",
    category: "Iniciante",
    maxPrice: "150",
    openOnly: true,
  });
  assert.deepEqual(result.map((item) => item.id), ["one"]);
});

test("filters survive a URL round trip and unsafe values are discarded", () => {
  const parsed = parseDiscoveryFilters({ busca: " Copa ", uf: "ba", preco: "200", abertos: "1", de: "invalid" });
  assert.equal(parsed.state, "BA");
  assert.equal(parsed.dateFrom, "");
  assert.equal(discoveryFiltersToQuery(parsed), "busca=Copa&uf=BA&preco=200&abertos=1");
});
