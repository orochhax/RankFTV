// Tipos compartilhados usados por componentes e server functions.
// Esta é a fonte de verdade para tipos de domínio — não lib/mock.

export type Genero = "masculino" | "feminino";
export type GeneroCategoria = Genero | "mista";

export type ChampionshipStatus =
  | "rascunho"
  | "inscricoes_abertas"
  | "em_andamento"
  | "encerrado";

export type Category = {
  id: string;
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: number;
  corteRatingMin: number;
  corteRatingMax: number;
};

export type Championship = {
  id: string;
  nome: string;
  descricao: string;
  regulamento: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  local: string;
  status: ChampionshipStatus;
  organizadorId: string;
  taxaPlataforma: number;
  bannerFrom: string;
  bannerTo: string;
  bannerUrl?: string | null;
  liveUrl?: string | null;
  isVitrine?: boolean;
  categorias: Category[];
};

export type BracketDupla = {
  nomes: [string, string];
};

export type BracketMatch = {
  id: string;
  duplaA: BracketDupla;
  duplaB: BracketDupla;
  placar?: string;
  winner: "a" | "b" | null;
};

export type BracketRound = {
  nome: string;
  matches: BracketMatch[];
};

export type BracketCategory = {
  id: string;
  nome: string;
  rounds: BracketRound[];
  terceiroLugar?: BracketMatch;
};

export type RatingPoint = { mes: string; rating: number };
