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
}): PublicFinancialError {
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
