export type PublicFinancialError = {
  message: string;
  code: string;
  ambiguous: boolean;
};

export function publicAsaasError(input: {
  status: number | null;
  code: string;
  ambiguous: boolean;
  billingType?: string | null;
  operationType?: string | null;
  rawMessage?: string | null;
}): PublicFinancialError {
  if (input.operationType === "transfer") {
    if (input.ambiguous) {
      return {
        message: "Não foi possível confirmar a resposta do saque. O status será atualizado automaticamente.",
        code: input.code,
        ambiguous: true,
      };
    }
    if (input.status === 429) {
      return {
        message: "Muitas tentativas de saque. Aguarde alguns minutos e tente novamente.",
        code: input.code,
        ambiguous: false,
      };
    }
    const rawLower = (input.rawMessage ?? "").toLowerCase();
    if (rawLower.includes("saldo insuficiente")) {
      return {
        message: "Saldo insuficiente na conta de pagamentos para concluir a transferência Pix.",
        code: input.code,
        ambiguous: false,
      };
    }
    if (rawLower.includes("chave") || rawLower.includes("pix")) {
      return {
        message: "A chave Pix foi recusada pelo processador de pagamentos. Verifique sua chave cadastrada.",
        code: input.code,
        ambiguous: false,
      };
    }
    return {
      message: "Não foi possível concluir o saque via Pix. Revise seus dados ou tente novamente em instantes.",
      code: input.code,
      ambiguous: false,
    };
  }

  if (input.ambiguous) {
    return {
      message: "Não foi possível confirmar a resposta do pagamento.",
      code: input.code,
      ambiguous: true,
    };
  }
  if (input.status === 429) {
    return {
      message: "Muitas tentativas de pagamento. Aguarde e tente novamente.",
      code: input.code,
      ambiguous: false,
    };
  }
  if (input.billingType === "PIX") {
    return {
      message: "Não foi possível gerar a cobrança Pix. Tente novamente em instantes.",
      code: input.code,
      ambiguous: false,
    };
  }
  return {
    message: "O pagamento foi recusado. Revise os dados e tente novamente.",
    code: input.code,
    ambiguous: false,
  };
}
