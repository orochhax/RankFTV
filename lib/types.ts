// Tipos compartilhados usados por componentes e server functions.
// Fonte de verdade para os tipos de domínio da aplicação.

export type Genero = "masculino" | "feminino" | "outro";
export type GeneroCategoria = "masculino" | "feminino" | "mista";

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
  maxDuplas?: number;
  esgotado?: boolean;
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
  /** Foco do enquadramento do banner (0–100%); null = centro. */
  bannerPositionX?: number | null;
  bannerPositionY?: number | null;
  liveUrl?: string | null;
  isElite?: boolean;
  isVitrine?: boolean;
  usaMotorCategoria: boolean;
  prevendaInicio?: string | null;
  prevendaFim?: string | null;
  categorias: Category[];
};

export type BracketDupla = {
  nomes: [string, string];
};

export type BracketMatch = {
  id: string;
  numero: number;
  duplaA: BracketDupla;
  duplaB: BracketDupla;
  veioDaRepescagemA?: boolean;
  veioDaRepescagemB?: boolean;
  placar?: string;
  sets?: Array<{ a: number; b: number }>;
  quadra?: string;
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
  formato?: "single_elimination" | "double_elimination";
  repescagem?: BracketRound[];
  grandeFinal?: BracketMatch;
  finalReset?: BracketMatch;
};

export type RatingPoint = { mes: string; rating: number };
