// Histórico financeiro do aluno numa arena — uma linha por cobrança, unindo
// mensalidades (student_charges) e aulas avulsas (arena_attendance com
// tipo_cobranca='avulsa'). Lógica pura e testável, sem tocar o Supabase.

export type CategoriaCobranca = "mensalidade" | "aula_avulsa";
export type StatusCobranca = "pendente" | "processando" | "pago" | "falhou" | "estornado" | "cancelado";

export type CobrancaHistorico = {
  id:         string;
  data:       string; // ISO (date ou datetime) — usado só pra ordenar
  descricao:  string;
  valor:      number;
  status:     StatusCobranca;
  categoria:  CategoriaCobranca;
};

export const CATEGORIA_LABEL: Record<CategoriaCobranca, string> = {
  mensalidade: "Mensalidade",
  aula_avulsa: "Aula avulsa",
};

export const STATUS_COBRANCA_LABEL: Record<StatusCobranca, string> = {
  pendente:    "Pendente",
  processando: "Processando",
  pago:        "Pago",
  falhou:      "Falhou",
  estornado:   "Estornado",
  cancelado:   "Cancelado",
};

/** Mais recente primeiro. Não muta o array recebido. */
export function ordenarHistoricoCobrancas(itens: CobrancaHistorico[]): CobrancaHistorico[] {
  return [...itens].sort((a, b) => b.data.localeCompare(a.data));
}

type StudentChargeRow = {
  id: string;
  competencia: string; // "YYYY-MM"
  valor: number;
  status_pagamento: string;
};

export function mensalidadeParaHistorico(row: StudentChargeRow): CobrancaHistorico {
  const status: StatusCobranca =
    row.status_pagamento === "pago" ? "pago" :
    row.status_pagamento === "estornado" ? "estornado" :
    row.status_pagamento === "cancelado" ? "cancelado" : "pendente";
  return {
    id:        row.id,
    data:      `${row.competencia}-01`,
    descricao: `Mensalidade ${row.competencia}`,
    valor:     row.valor,
    status,
    categoria: "mensalidade",
  };
}

type AulaAvulsaRow = {
  id: string;
  data: string;
  titulo: string;
  valor_avulso: number | null;
  pagamento_status: string;
};

export function aulaAvulsaParaHistorico(row: AulaAvulsaRow): CobrancaHistorico {
  const status: StatusCobranca =
    row.pagamento_status === "pago" ? "pago" :
    row.pagamento_status === "processando" ? "processando" :
    row.pagamento_status === "falhou" ? "falhou" : "pendente";
  return {
    id:        row.id,
    data:      row.data,
    descricao: `Aula avulsa — ${row.titulo}`,
    valor:     row.valor_avulso ?? 0,
    status,
    categoria: "aula_avulsa",
  };
}
