/**
 * RANKFTV — KYC e Verificação de Identidade do Organizador
 * Regras de validação, status e motivos padronizados de rejeição.
 */

export type StatusVerificacaoOrganizador =
  | "pendente_documentos"
  | "em_analise"
  | "aprovado"
  | "rejeitado";

export type TipoDocumentoOrganizador = "cnh" | "rg";

export const MOTIVOS_REJEICAO_PREDEFINIDOS = [
  "Foto do documento ilegível, cortada ou escura",
  "Foto do verso do documento ausente, cortada ou ilegível",
  "Documento vencido, não aceito ou rasurado (aceito apenas RG ou CNH)",
  "CPF ou Nome informado diverge do documento apresentado",
  "Chave Pix informada pertence a outra pessoa (deve ser no mesmo CPF/CNPJ)",
  "Outro motivo (especificar)",
] as const;

export type MotivoRejeicaoPredefinido = typeof MOTIVOS_REJEICAO_PREDEFINIDOS[number];

/** Retorna se a conta de organizador está autorizada a publicar campeonatos pagos. */
export function podePublicarCampeonatoPago(status?: string | null): boolean {
  return status === "aprovado";
}

/** Retorna label e cor semântica do status de verificação. */
export function getStatusVerificacaoBadge(status?: string | null): {
  label: string;
  descricao: string;
  variant: "neutral" | "warning" | "success" | "danger";
} {
  switch (status) {
    case "aprovado":
      return {
        label: "Verificado e Aprovado",
        descricao: "Identidade confirmada. Vendas e publicações liberadas.",
        variant: "success",
      };
    case "em_analise":
      return {
        label: "Em Análise",
        descricao: "Documentos enviados. Em análise pela equipe RankFTV (até 24h úteis).",
        variant: "warning",
      };
    case "rejeitado":
      return {
        label: "Documentos Recusados",
        descricao: "Há pendências nos documentos enviados que precisam ser corrigidas.",
        variant: "danger",
      };
    case "pendente_documentos":
    default:
      return {
        label: "Pendente de Documentos",
        descricao: "Envie seus dados e fotos para liberar as vendas e recebimento.",
        variant: "neutral",
      };
  }
}
