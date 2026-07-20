// Regras puras de presença/cobrança da arena que ainda são úteis fora do
// banco: cálculo de preço (exibição) e o estado de acesso pro aluno (banner
// "Plano encerrado"). A decisão de segurança de fato — gênero, vaga,
// crédito semanal, cartão — foi movida pra dentro de
// supabase/harden-arena-attendance-security.sql (SECURITY DEFINER,
// deriva tudo de auth.uid()), porque uma cópia dessas regras em TypeScript
// não impedia alguém de chamar a RPC direto com parâmetros forjados. Não
// reintroduza esse tipo de função "espelho" aqui — se a regra importa pra
// segurança, ela mora no banco.

/** Preço final de uma aula avulsa: valor-base + taxa de serviço de 10%,
 *  mesma regra usada em mensalidade/aluguel/diária da arena. */
export function valorAvulsaComTaxa(valorBase: number): number {
  return parseFloat((valorBase * 1.10).toFixed(2));
}

// ── Tradução dos erros da RPC de presença ───────────────────────────────────
// arena_confirm_attendance/arena_cancel_attendance (SQL) são a única fonte
// de verdade das regras — validam tudo e devolvem RAISE EXCEPTION com um
// texto que o usuário não deveria ver cru. "CÓDIGO:valor" (ex.
// "AVULSA_PREVIEW:55.00") carrega um dado estruturado junto da mensagem; o
// valor depois dos dois-pontos é extraído à parte.
export type ErroRpcInterpretado = { codigo: string; valor?: string; mensagem: string };

export function interpretarErroRpc(raw: string): ErroRpcInterpretado {
  const [codigo, valor] = raw.split(":");
  switch (codigo) {
    case "PERFIL_SEM_GENERO":
      return { codigo, mensagem: "PERFIL_SEM_GENERO" };
    case "GENERO_INCOMPATIVEL": {
      const label = valor === "masculino" ? "masculino" : "feminino";
      return { codigo, valor, mensagem: `Esta aula é restrita a alunos do gênero ${label}.` };
    }
    case "CARTAO_NECESSARIO":
      return { codigo, mensagem: "CARTAO_NECESSARIO" };
    case "AVULSA_PREVIEW":
      return { codigo, valor, mensagem: "AVULSA_PREVIEW" };
    case "SEM_CREDITO_SEM_AVULSA":
      return { codigo, mensagem: "Você não tem crédito disponível e esta aula não aceita avulsa." };
    case "AULA_LOTADA":
      return { codigo, mensagem: "Essa aula já está lotada." };
    case "PRAZO_EXPIRADO":
      return { codigo, valor, mensagem: `O prazo pra desmarcar já passou — só até ${valor}h antes da aula.` };
    default:
      // Mensagens "de prosa" (já em português, sem prefixo de código) —
      // devolvidas como vieram da função, que já escreve pro usuário final.
      return { codigo: "", mensagem: raw || "Erro ao confirmar presença. Tente novamente." };
  }
}

// ── Acesso ao plano — separado do estado ao vivo do plano ──────────────────
// Nunca decida "o aluno tem plano" olhando só plan_id ou o plano em si (que
// pode ter sido arquivado/reprecificado). A fonte de verdade é o período já
// pago (access_until) e se a renovação segue ativa — ver seção 5 do pedido
// que criou isso. access_until nulo é o estado legado/plano gratuito (sem
// assinatura Asaas rastreável): mantém o comportamento anterior, liberado
// enquanto o vínculo estiver com status 'ativo' e algum plan_id.

export type VinculoAcesso = {
  planId: string | null;
  accessUntil: string | null; // "YYYY-MM-DD", ou null (legado/gratuito)
  hoje: string;                // "YYYY-MM-DD"
};

export function temAcessoAoPlano(input: VinculoAcesso): boolean {
  if (!input.planId) return false;
  if (input.accessUntil == null) return true;
  return input.accessUntil >= input.hoje;
}

export type EstadoPlanoAluno =
  | { estado: "sem_plano" }
  | { estado: "ativo" }
  | { estado: "encerrado_com_acesso"; accessUntil: string }
  | { estado: "encerrado_sem_acesso"; accessUntil: string | null };

/**
 * Estado pra exibição: distingue "plano em dia" de "organizador
 * arquivou/reprecificou, mas o período pago ainda não acabou" — é esse
 * segundo caso que deve mostrar "Plano encerrado — acesso válido até X" em
 * vez de esconder o direito que o aluno já pagou.
 */
export function estadoPlanoAluno(input: {
  planId: string | null;
  renovacaoAtiva: boolean;
  accessUntil: string | null;
  hoje: string;
}): EstadoPlanoAluno {
  if (!input.planId) return { estado: "sem_plano" };
  const temAcesso = temAcessoAoPlano({ planId: input.planId, accessUntil: input.accessUntil, hoje: input.hoje });
  if (input.renovacaoAtiva) {
    return temAcesso ? { estado: "ativo" } : { estado: "encerrado_sem_acesso", accessUntil: input.accessUntil };
  }
  return temAcesso
    ? { estado: "encerrado_com_acesso", accessUntil: input.accessUntil as string }
    : { estado: "encerrado_sem_acesso", accessUntil: input.accessUntil };
}
