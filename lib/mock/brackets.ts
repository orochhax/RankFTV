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

export type ChampionshipBracket = {
  championshipId: string;
  categories: BracketCategory[];
};

export const BRACKETS: ChampionshipBracket[] = [
  {
    championshipId: "copa-litoral-ftv",
    categories: [
      {
        id: "clf-a-masc",
        nome: "A Masculino",
        rounds: [
          {
            nome: "Quartas de Final",
            matches: [
              {
                id: "clf-am-q1",
                duplaA: { nomes: ["Lucas Andrade", "Gabriel Costa"] },
                duplaB: { nomes: ["Bruno Lima", "Marcos Vieira"] },
                placar: "21-12, 21-11",
                winner: "a",
              },
              {
                id: "clf-am-q2",
                duplaA: { nomes: ["Felipe Rodrigues", "Caio Martins"] },
                duplaB: { nomes: ["Pedro Henrique Silva", "Matheus Oliveira"] },
                placar: "21-18, 21-16",
                winner: "a",
              },
              {
                id: "clf-am-q3",
                duplaA: { nomes: ["Thiago Pereira", "Leonardo Ribeiro"] },
                duplaB: { nomes: ["Diego Almeida", "Eduardo Nascimento"] },
                placar: "21-14, 21-17",
                winner: "a",
              },
              {
                id: "clf-am-q4",
                duplaA: { nomes: ["Rafael Souza", "Vinicius Carvalho"] },
                duplaB: { nomes: ["André Barbosa", "Gustavo Ferreira"] },
                placar: "21-19, 21-17",
                winner: "a",
              },
            ],
          },
          {
            nome: "Semifinais",
            matches: [
              {
                id: "clf-am-s1",
                duplaA: { nomes: ["Lucas Andrade", "Gabriel Costa"] },
                duplaB: { nomes: ["Felipe Rodrigues", "Caio Martins"] },
                placar: "21-17, 21-14",
                winner: "a",
              },
              {
                id: "clf-am-s2",
                duplaA: { nomes: ["Thiago Pereira", "Leonardo Ribeiro"] },
                duplaB: { nomes: ["Rafael Souza", "Vinicius Carvalho"] },
                placar: "21-19, 18-21, 21-16",
                winner: "a",
              },
            ],
          },
          {
            nome: "Final",
            matches: [
              {
                id: "clf-am-f",
                duplaA: { nomes: ["Lucas Andrade", "Gabriel Costa"] },
                duplaB: { nomes: ["Thiago Pereira", "Leonardo Ribeiro"] },
                placar: "19-21, 21-19, 21-17",
                winner: "b",
              },
            ],
          },
        ],
        terceiroLugar: {
          id: "clf-am-3p",
          duplaA: { nomes: ["Rafael Souza", "Vinicius Carvalho"] },
          duplaB: { nomes: ["Felipe Rodrigues", "Caio Martins"] },
          placar: "21-15, 21-18",
          winner: "a",
        },
      },
      {
        id: "clf-b-masc",
        nome: "B Masculino",
        rounds: [
          {
            nome: "Semifinais",
            matches: [
              {
                id: "clf-bm-s1",
                duplaA: { nomes: ["Pedro Henrique Silva", "Matheus Oliveira"] },
                duplaB: { nomes: ["Diego Almeida", "Eduardo Nascimento"] },
                placar: "21-16, 21-14",
                winner: "a",
              },
              {
                id: "clf-bm-s2",
                duplaA: { nomes: ["André Barbosa", "Caio Martins"] },
                duplaB: { nomes: ["Gustavo Ferreira", "Bruno Lima"] },
                placar: "21-11, 21-15",
                winner: "a",
              },
            ],
          },
          {
            nome: "Final",
            matches: [
              {
                id: "clf-bm-f",
                duplaA: { nomes: ["Pedro Henrique Silva", "Matheus Oliveira"] },
                duplaB: { nomes: ["André Barbosa", "Caio Martins"] },
                placar: "19-21, 21-16, 21-14",
                winner: "b",
              },
            ],
          },
        ],
        terceiroLugar: {
          id: "clf-bm-3p",
          duplaA: { nomes: ["Diego Almeida", "Eduardo Nascimento"] },
          duplaB: { nomes: ["Gustavo Ferreira", "Bruno Lima"] },
          placar: "21-12",
          winner: "a",
        },
      },
      {
        id: "clf-mista",
        nome: "Mista",
        rounds: [
          {
            nome: "Semifinais",
            matches: [
              {
                id: "clf-mi-s1",
                duplaA: { nomes: ["Ana Beatriz Santos", "Rafael Souza"] },
                duplaB: { nomes: ["Mariana Costa", "Felipe Rodrigues"] },
                placar: "21-16, 21-13",
                winner: "a",
              },
              {
                id: "clf-mi-s2",
                duplaA: { nomes: ["Beatriz Souza", "Thiago Pereira"] },
                duplaB: { nomes: ["Juliana Lima", "Caio Martins"] },
                placar: "19-21, 21-18, 21-19",
                winner: "a",
              },
            ],
          },
          {
            nome: "Final",
            matches: [
              {
                id: "clf-mi-f",
                duplaA: { nomes: ["Ana Beatriz Santos", "Rafael Souza"] },
                duplaB: { nomes: ["Beatriz Souza", "Thiago Pereira"] },
                placar: "21-18, 21-20",
                winner: "a",
              },
            ],
          },
        ],
        terceiroLugar: {
          id: "clf-mi-3p",
          duplaA: { nomes: ["Mariana Costa", "Felipe Rodrigues"] },
          duplaB: { nomes: ["Juliana Lima", "Caio Martins"] },
          placar: "21-12, 21-17",
          winner: "a",
        },
      },
    ],
  },
];

export function getBracket(championshipId: string): ChampionshipBracket | undefined {
  return BRACKETS.find((b) => b.championshipId === championshipId);
}
