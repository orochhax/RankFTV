import { getAthleteById } from "./athletes";
import type { Athlete, Championship, Team } from "./types";

function duplas(championshipId: string, pares: [string, string, string][]): Team[] {
  // pares: [categoryId, atleta1Id, atleta2Id]
  return pares.map(([categoryId, atleta1Id, atleta2Id], i) => ({
    id: `${championshipId}-t${i + 1}`,
    categoryId,
    atleta1Id,
    atleta2Id,
  }));
}

// 5 campeonatos fictícios. Datas relativas a hoje (16/06/2026) pra ter um pouco
// de tudo: inscrições abertas, em andamento e encerrado — assim a ordenação da
// lista de Campeonatos (abertas primeiro) dá pra ver funcionando de verdade.
export const CHAMPIONSHIPS: Championship[] = [
  {
    id: "copa-litoral-ftv",
    nome: "Copa Litoral FTV",
    descricao: "Etapa clássica do litoral paulista, na areia de Santos.",
    regulamento:
      "Jogos em sets de 21 pontos, melhor de 3. Tolerância de 15 minutos de atraso " +
      "(WO automático depois disso). Categoria definida pelo organizador na inscrição. " +
      "Obrigatório uniforme da dupla no dia da final.",
    dataInicio: "2026-07-18",
    dataFim: "2026-07-19",
    cidade: "Santos",
    estado: "SP",
    local: "Praia do Gonzaga, Quadras 4 a 8",
    status: "inscricoes_abertas",
    organizadorId: "a01",
    taxaPlataforma: 8,
    bannerFrom: "from-blue-500",
    bannerTo: "to-cyan-400",
    categorias: [
      { id: "clf-a-masc", nome: "A", genero: "masculino", valorInscricao: 130, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "clf-b-masc", nome: "B", genero: "masculino", valorInscricao: 100, corteRatingMin: 1550, corteRatingMax: 1849 },
      { id: "clf-mista", nome: "Mista", genero: "mista", valorInscricao: 90, corteRatingMin: 0, corteRatingMax: 9999 },
    ],
    duplas: duplas("clf", [
      ["clf-a-masc", "a01", "a03"],
      ["clf-a-masc", "a07", "a14"],
      ["clf-b-masc", "a02", "a09"],
      ["clf-b-masc", "a11", "a13"],
      ["clf-mista", "a16", "a05"],
    ]),
  },
  {
    id: "floripa-beach-cup",
    nome: "Floripa Beach Cup",
    descricao: "Um dos maiores eventos de futevôlei do sul do país.",
    regulamento:
      "Sistema de grupos + mata-mata. Check-in obrigatório até 1h antes do primeiro jogo " +
      "da categoria. No-show sem aviso prévio gera suspensão na próxima etapa.",
    dataInicio: "2026-08-08",
    dataFim: "2026-08-09",
    cidade: "Florianópolis",
    estado: "SC",
    local: "Praia Mole",
    status: "inscricoes_abertas",
    organizadorId: "a05",
    taxaPlataforma: 8,
    bannerFrom: "from-emerald-500",
    bannerTo: "to-teal-400",
    categorias: [
      { id: "fbc-a-masc", nome: "A", genero: "masculino", valorInscricao: 130, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "fbc-a-fem", nome: "A", genero: "feminino", valorInscricao: 130, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "fbc-b-mista", nome: "B", genero: "mista", valorInscricao: 90, corteRatingMin: 1550, corteRatingMax: 1849 },
    ],
    duplas: duplas("fbc", [
      ["fbc-a-masc", "a01", "a03"],
      ["fbc-a-fem", "a16", "a18"],
      ["fbc-a-fem", "a20", "a25"],
      ["fbc-b-mista", "a19", "a13"],
      ["fbc-b-mista", "a22", "a09"],
    ]),
  },
  {
    id: "circuito-nordeste",
    nome: "Circuito Nordeste de Futevôlei",
    descricao: "Etapa única reunindo as melhores duplas do Nordeste.",
    regulamento:
      "Categorias mistas. Pontuação cruzada entre as duplas do grupo, sem mata-mata — " +
      "quem soma mais pontos no fim do dia é campeão.",
    dataInicio: "2026-06-14",
    dataFim: "2026-06-20",
    cidade: "Fortaleza",
    estado: "CE",
    local: "Praia do Futuro",
    status: "em_andamento",
    organizadorId: "a09",
    taxaPlataforma: 8,
    bannerFrom: "from-orange-500",
    bannerTo: "to-amber-400",
    categorias: [
      { id: "cn-a-mista", nome: "A", genero: "mista", valorInscricao: 110, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "cn-b-mista", nome: "B", genero: "mista", valorInscricao: 80, corteRatingMin: 1550, corteRatingMax: 1849 },
    ],
    duplas: duplas("cn", [
      ["cn-a-mista", "a25", "a07"],
      ["cn-a-mista", "a16", "a03"],
      ["cn-b-mista", "a22", "a02"],
      ["cn-b-mista", "a30", "a04"],
    ]),
  },
  {
    id: "torneio-internacional-santos",
    nome: "Torneio Internacional de Santos",
    descricao: "Tradicional torneio santista, com duplas convidadas de outros estados.",
    regulamento:
      "Inscrição por categoria, com corte de rating mínimo. Premiação em dinheiro pro " +
      "campeão e vice de cada categoria A.",
    dataInicio: "2026-09-12",
    dataFim: "2026-09-13",
    cidade: "Santos",
    estado: "SP",
    local: "Praia de Santos, em frente ao Aquário",
    status: "inscricoes_abertas",
    organizadorId: "a15",
    taxaPlataforma: 10,
    bannerFrom: "from-violet-500",
    bannerTo: "to-purple-400",
    categorias: [
      { id: "tis-a-masc", nome: "A", genero: "masculino", valorInscricao: 150, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "tis-a-fem", nome: "A", genero: "feminino", valorInscricao: 150, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "tis-b-masc", nome: "B", genero: "masculino", valorInscricao: 110, corteRatingMin: 1550, corteRatingMax: 1849 },
      { id: "tis-b-fem", nome: "B", genero: "feminino", valorInscricao: 110, corteRatingMin: 1550, corteRatingMax: 1849 },
    ],
    duplas: duplas("tis", [
      ["tis-a-masc", "a01", "a14"],
      ["tis-a-fem", "a16", "a27"],
      ["tis-b-masc", "a09", "a13"],
      ["tis-b-fem", "a17", "a24"],
    ]),
  },
  {
    id: "praia-grande-open",
    nome: "Praia Grande Open",
    descricao: "Etapa encerrada — fica de exemplo de campeonato já realizado.",
    regulamento: "Categorias mistas A, B e C. Premiação simbólica pros 3 primeiros de cada categoria.",
    dataInicio: "2026-05-02",
    dataFim: "2026-05-03",
    cidade: "Guarujá",
    estado: "SP",
    local: "Praia da Enseada",
    status: "encerrado",
    organizadorId: "a02",
    taxaPlataforma: 8,
    bannerFrom: "from-slate-500",
    bannerTo: "to-slate-400",
    categorias: [
      { id: "pgo-a-mista", nome: "A", genero: "mista", valorInscricao: 100, corteRatingMin: 1850, corteRatingMax: 9999 },
      { id: "pgo-b-mista", nome: "B", genero: "mista", valorInscricao: 80, corteRatingMin: 1550, corteRatingMax: 1849 },
      { id: "pgo-c-mista", nome: "C", genero: "mista", valorInscricao: 60, corteRatingMin: 0, corteRatingMax: 1549 },
    ],
    duplas: duplas("pgo", [
      ["pgo-a-mista", "a03", "a16"],
      ["pgo-b-mista", "a08", "a26"],
      ["pgo-c-mista", "a06", "a21"],
      ["pgo-c-mista", "a10", "a28"],
    ]),
  },
];

const STATUS_PRIORIDADE: Record<Championship["status"], number> = {
  inscricoes_abertas: 0,
  em_andamento: 1,
  rascunho: 2,
  encerrado: 3,
};

// Inscrições abertas sempre primeiro (ver ftv.md seção 8.4); dentro de cada
// status, ordena pela data mais próxima.
export function sortedChampionships(list: Championship[] = CHAMPIONSHIPS): Championship[] {
  return [...list].sort((a, b) => {
    const prio = STATUS_PRIORIDADE[a.status] - STATUS_PRIORIDADE[b.status];
    if (prio !== 0) return prio;
    return a.dataInicio.localeCompare(b.dataInicio);
  });
}

export function getChampionshipById(id: string): Championship | undefined {
  return CHAMPIONSHIPS.find((c) => c.id === id);
}

export function getChampionshipsOrganizedBy(athleteId: string): Championship[] {
  return CHAMPIONSHIPS.filter((c) => c.organizadorId === athleteId);
}

// Todas as duplas (em qualquer campeonato) que incluem esse atleta — usado na
// Home ("meus próximos campeonatos") e no histórico do perfil.
export function getChampionshipsForAthlete(athleteId: string): Championship[] {
  return CHAMPIONSHIPS.filter((c) => c.duplas.some((t) => t.atleta1Id === athleteId || t.atleta2Id === athleteId));
}

export const ESTADOS_COM_CAMPEONATO = Array.from(new Set(CHAMPIONSHIPS.map((c) => c.estado))).sort();
export const CATEGORIAS_DISPONIVEIS = Array.from(
  new Set(CHAMPIONSHIPS.flatMap((c) => c.categorias.map((cat) => cat.nome))),
).sort();

// Financeiro estimado a partir das duplas fake já inscritas — só pra dar
// números reais de exibir no Painel do organizador (ftv.md seção 8.7).
export function championshipFinance(championship: Championship) {
  const totalArrecadado = championship.categorias.reduce((soma, cat) => {
    const duplasNaCategoria = championship.duplas.filter((t) => t.categoryId === cat.id).length;
    return soma + cat.valorInscricao * duplasNaCategoria;
  }, 0);
  const taxa = totalArrecadado * (championship.taxaPlataforma / 100);
  return { totalArrecadado, taxa, repasse: totalArrecadado - taxa };
}

export type ResolvedTeam = {
  id: string;
  categoriaNome: string;
  categoriaGenero: Championship["categorias"][number]["genero"];
  atleta1: Athlete | undefined;
  atleta2: Athlete | undefined;
};

// Resolve os ids de uma dupla pros objetos de atleta de verdade — usado na
// lista pública de duplas inscritas da página de detalhe do campeonato.
export function resolveDuplas(championship: Championship): ResolvedTeam[] {
  return championship.duplas.map((team) => {
    const categoria = championship.categorias.find((c) => c.id === team.categoryId);
    return {
      id: team.id,
      categoriaNome: categoria?.nome ?? "-",
      categoriaGenero: categoria?.genero ?? "mista",
      atleta1: getAthleteById(team.atleta1Id),
      atleta2: getAthleteById(team.atleta2Id),
    };
  });
}
