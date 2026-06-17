// Sistema de níveis do futevôlei (categorias em que o atleta joga um campeonato).
// Ordem do MENOR pro MAIOR. Dentro de uma faixa, "A" é mais forte que "B"
// (decisão de produto), então a sequência crescente é: ...B, A, próxima faixa B, A...
//
// O `key` é o que vai gravado no banco (coluna `categoria` de external_results);
// `label` é o que aparece na tela; `ordem` é usado pra comparar/plotar (eixo Y do
// gráfico de evolução e cálculo do "nível mais alto").

export type NivelKey =
  | "estreante_b"
  | "estreante_a"
  | "iniciante_b"
  | "iniciante_a"
  | "intermediario_b"
  | "intermediario_a"
  | "avancado_b"
  | "avancado_a"
  | "profissional";

export type Nivel = {
  key: NivelKey;
  label: string;
  ordem: number; // 1 = mais baixo, 9 = mais alto
};

export const NIVEIS: Nivel[] = [
  { key: "estreante_b", label: "Estreante B", ordem: 1 },
  { key: "estreante_a", label: "Estreante A", ordem: 2 },
  { key: "iniciante_b", label: "Iniciante B", ordem: 3 },
  { key: "iniciante_a", label: "Iniciante A", ordem: 4 },
  { key: "intermediario_b", label: "Intermediário B", ordem: 5 },
  { key: "intermediario_a", label: "Intermediário A", ordem: 6 },
  { key: "avancado_b", label: "Avançado B", ordem: 7 },
  { key: "avancado_a", label: "Avançado A", ordem: 8 },
  { key: "profissional", label: "Profissional", ordem: 9 },
];

export const NIVEL_MAX_ORDEM = NIVEIS.length; // 9

const POR_KEY = new Map(NIVEIS.map((n) => [n.key, n]));

// Aceita string solta do banco (pode vir nula/desconhecida) e devolve o Nivel.
export function getNivel(key: string | null | undefined): Nivel | null {
  if (!key) return null;
  return POR_KEY.get(key as NivelKey) ?? null;
}

export function nivelLabel(key: string | null | undefined): string | null {
  return getNivel(key)?.label ?? null;
}

export function nivelOrdem(key: string | null | undefined): number | null {
  return getNivel(key)?.ordem ?? null;
}

// "Nível atual" = a faixa mais alta em que o atleta já pegou pódio.
// Recebe as categorias (keys) das colocações de pódio e devolve o Nivel de topo.
export function nivelMaisAlto(categorias: (string | null | undefined)[]): Nivel | null {
  let melhor: Nivel | null = null;
  for (const c of categorias) {
    const n = getNivel(c);
    if (n && (!melhor || n.ordem > melhor.ordem)) melhor = n;
  }
  return melhor;
}
