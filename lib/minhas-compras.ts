export type ComprasTab = "atleta" | "plateia";

export type CompraInscricaoRow = {
  id: string;
  status: string;
  championship_id: string;
  category_id: string;
  atleta1_id: string;
  championships: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    cidade: string;
    estado: string;
    status: string;
  } | null;
  championship_categories: {
    nome: string;
    genero: string;
    valor_inscricao: number;
  } | null;
  registrations: { id: string; status_pagamento: string }[] | null;
};

export function resolveComprasTab(
  requested: string | undefined,
  atletaCount: number,
  plateiaCount: number,
): ComprasTab {
  if (requested === "atleta" || requested === "plateia") return requested;
  if (atletaCount > 0 || plateiaCount === 0) return "atleta";
  return "plateia";
}
