import type { Athlete, Genero } from "./types";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

type SeedAthlete = [
  nome: string,
  username: string,
  genero: Genero,
  cidade: string,
  estado: string,
  rating: number,
  conquistas?: string[],
];

// 30 atletas fictícios pra dar vida ao protótipo (sem Supabase ainda — ver ftv.md).
// Ratings espalhados de propósito pra Rank e categorias ficarem variados.
const SEED: SeedAthlete[] = [
  ["Lucas Andrade", "lucas.andrade", "masculino", "Santos", "SP", 2080, ["Campeão - Circuito Verão 2025"]],
  ["Pedro Henrique Silva", "pedro.silva", "masculino", "Guarujá", "SP", 1740],
  ["Gabriel Costa", "gabriel.costa", "masculino", "Rio de Janeiro", "RJ", 1950, ["Vice-campeão - Copa Litoral FTV"]],
  ["Matheus Oliveira", "matheus.oliveira", "masculino", "Niterói", "RJ", 1620],
  ["Rafael Souza", "rafael.souza", "masculino", "Florianópolis", "SC", 1880],
  ["Bruno Lima", "bruno.lima", "masculino", "Balneário Camboriú", "SC", 1490],
  ["Thiago Pereira", "thiago.pereira", "masculino", "Salvador", "BA", 2010, ["Campeão - Torneio Internacional de Santos"]],
  ["Gustavo Ferreira", "gustavo.ferreira", "masculino", "Porto Seguro", "BA", 1560],
  ["Felipe Rodrigues", "felipe.rodrigues", "masculino", "Fortaleza", "CE", 1710],
  ["Diego Almeida", "diego.almeida", "masculino", "Curitiba", "PR", 1380],
  ["Vinicius Carvalho", "vinicius.carvalho", "masculino", "Vitória", "ES", 1840],
  ["André Barbosa", "andre.barbosa", "masculino", "Recife", "PE", 1530],
  ["Caio Martins", "caio.martins", "masculino", "Porto Alegre", "RS", 1670],
  ["Leonardo Ribeiro", "leonardo.ribeiro", "masculino", "Brasília", "DF", 1920],
  ["Eduardo Nascimento", "eduardo.nascimento", "masculino", "Santos", "SP", 1450],
  ["Ana Beatriz Santos", "ana.santos", "feminino", "Santos", "SP", 2050, ["Campeã - Copa Litoral FTV"]],
  ["Mariana Costa", "mariana.costa", "feminino", "Rio de Janeiro", "RJ", 1790],
  ["Juliana Lima", "juliana.lima", "feminino", "Florianópolis", "SC", 1960, ["Vice-campeã - Floripa Beach Cup"]],
  ["Camila Oliveira", "camila.oliveira", "feminino", "Niterói", "RJ", 1630],
  ["Beatriz Souza", "beatriz.souza", "feminino", "Salvador", "BA", 1880],
  ["Larissa Pereira", "larissa.pereira", "feminino", "Guarujá", "SP", 1510],
  ["Fernanda Alves", "fernanda.alves", "feminino", "Fortaleza", "CE", 1740],
  ["Bianca Rodrigues", "bianca.rodrigues", "feminino", "Curitiba", "PR", 1420],
  ["Amanda Carvalho", "amanda.carvalho", "feminino", "Vitória", "ES", 1690],
  ["Letícia Martins", "leticia.martins", "feminino", "Recife", "PE", 1990, ["Campeã - Circuito Nordeste de Futevôlei"]],
  ["Gabriela Ribeiro", "gabriela.ribeiro", "feminino", "Porto Alegre", "RS", 1570],
  ["Isabela Nascimento", "isabela.nascimento", "feminino", "Brasília", "DF", 1850],
  ["Carolina Barbosa", "carolina.barbosa", "feminino", "Porto Seguro", "BA", 1360],
  ["Rafaela Gomes", "rafaela.gomes", "feminino", "Balneário Camboriú", "SC", 1620],
  ["Yasmin Cardoso", "yasmin.cardoso", "feminino", "Florianópolis", "SC", 1760],
];

export const ATHLETES: Athlete[] = SEED.map(
  ([nome, username, genero, cidade, estado, rating, conquistas], i) => ({
    id: `a${String(i + 1).padStart(2, "0")}`,
    username,
    nome,
    cidade,
    estado,
    genero,
    rating,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    conquistas: conquistas ?? [],
  }),
);

// Corte de categoria por rating — só pra exibição no protótipo. O motor de
// categoria de verdade (questionário + sandbagging) é a Fase 2 (ftv.md seção 7).
export function categoriaFromRating(rating: number): "A" | "B" | "C" {
  if (rating >= 1850) return "A";
  if (rating >= 1550) return "B";
  return "C";
}

export function getAthleteById(id: string): Athlete | undefined {
  return ATHLETES.find((a) => a.id === id);
}

export function getAthleteByUsername(username: string): Athlete | undefined {
  return ATHLETES.find((a) => a.username === username);
}

export type RankFiltro = {
  estado?: string; // undefined = Brasil todo
  genero?: Genero; // undefined = Geral (todo mundo)
};

export function rankAthletes({ estado, genero }: RankFiltro = {}): Athlete[] {
  return ATHLETES.filter((a) => (estado ? a.estado === estado : true))
    .filter((a) => (genero ? a.genero === genero : true))
    .sort((a, b) => b.rating - a.rating);
}

export const ESTADOS_DISPONIVEIS = Array.from(
  new Set(ATHLETES.map((a) => a.estado)),
).sort();
