// Tipos espelhando o modelo de dados real do ftv.md (seção 6), só que em formato
// "achatado" pra ser fácil de usar como dados fake. Quando entrar o Supabase de
// verdade, essas mesmas formas guiam o desenho das tabelas.

export type Genero = "masculino" | "feminino";
export type GeneroCategoria = Genero | "mista";

export type Athlete = {
  id: string;
  username: string;
  nome: string;
  cidade: string;
  estado: string; // sigla, ex.: "SP"
  genero: Genero;
  rating: number;
  avatarColor: string; // cor de fundo do avatar de iniciais (sem foto real ainda)
  conquistas: string[];
};

export type Category = {
  id: string;
  nome: string; // "A" | "B" | "C" | "Mista"
  genero: GeneroCategoria;
  valorInscricao: number;
  corteRatingMin: number;
  corteRatingMax: number;
};

export type ChampionshipStatus =
  | "rascunho"
  | "inscricoes_abertas"
  | "em_andamento"
  | "encerrado";

export type Team = {
  id: string;
  categoryId: string;
  atleta1Id: string;
  atleta2Id: string;
};

export type Championship = {
  id: string;
  nome: string;
  descricao: string;
  regulamento: string;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  cidade: string;
  estado: string;
  local: string;
  status: ChampionshipStatus;
  organizadorId: string;
  taxaPlataforma: number; // %
  bannerFrom: string; // cor inicial do gradiente do banner
  bannerTo: string; // cor final do gradiente do banner
  liveUrl?: string | null; // link externo da transmissão ao vivo (YouTube etc.)
  categorias: Category[];
  duplas: Team[];
};
