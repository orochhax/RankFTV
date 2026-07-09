// Validação de cupom de desconto. Server-only (usa admin client porque quem
// chama pode ser um visitante sem conta, ou um atleta logado que não é dono
// do campeonato — a RLS de `coupons` só libera leitura pro organizador).
import { createAdminClient } from "@/lib/supabase/admin";
import type { TipoDescontoCupom } from "@/lib/taxas";

export type CupomValido = {
  id: string;
  codigo: string;
  tipoDesconto: TipoDescontoCupom;
  valorDesconto: number;
};

/**
 * Busca e valida um cupom (existe, ativo, dentro do período, aplicável ao
 * tipo de compra, ainda tem vaga). NÃO reivindica o uso — isso só acontece
 * atomicamente via a função `claim_coupon_use` no momento de criar a
 * cobrança, pra evitar corrida entre duas pessoas usando o último uso
 * disponível ao mesmo tempo.
 */
export async function buscarCupomValido(
  championshipId: string,
  codigoInput: string,
  aplicaEm: "atleta" | "plateia",
): Promise<{ cupom?: CupomValido; error?: string }> {
  const codigo = codigoInput.trim().toUpperCase();
  if (!codigo) return { error: "Informe um código de cupom." };

  const admin = createAdminClient();
  const { data: cupom } = await admin
    .from("coupons")
    .select("id, codigo, tipo_desconto, valor_desconto, aplica_em, quantidade_maxima, usos_atuais, data_inicio, data_fim, ativo")
    .eq("championship_id", championshipId)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!cupom || !cupom.ativo) return { error: "Cupom inválido." };
  if (cupom.aplica_em !== "ambos" && cupom.aplica_em !== aplicaEm) {
    return { error: "Esse cupom não é válido para esse tipo de ingresso." };
  }

  const agora = new Date();
  if (cupom.data_inicio && agora < new Date(cupom.data_inicio)) {
    return { error: "Esse cupom ainda não está disponível." };
  }
  if (cupom.data_fim && agora > new Date(cupom.data_fim)) {
    return { error: "Esse cupom expirou." };
  }
  if (cupom.quantidade_maxima != null && cupom.usos_atuais >= cupom.quantidade_maxima) {
    return { error: "Esse cupom já atingiu o limite de usos." };
  }

  return {
    cupom: {
      id:            cupom.id,
      codigo:        cupom.codigo,
      tipoDesconto:  cupom.tipo_desconto as TipoDescontoCupom,
      valorDesconto: Number(cupom.valor_desconto),
    },
  };
}
