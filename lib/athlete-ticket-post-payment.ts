export type AthletePostPaymentState = "awaiting" | "analysis" | "confirmed";

export function athletePostPaymentState(
  paymentStatus: string,
  paymentInAnalysis: boolean,
): AthletePostPaymentState {
  if (paymentStatus === "pago") return "confirmed";
  if (paymentInAnalysis) return "analysis";
  return "awaiting";
}

export function athletePaymentMethodLabel(paymentMethod: "pix" | "cartao") {
  return paymentMethod === "pix" ? "Pix" : "Cartão";
}

// Não é um token nem substitui a URL privada: é só uma referência curta para
// o comprador identificar o pedido ao falar com a organização.
export function athleteOrderReference(ticketId: string) {
  return `#${ticketId.slice(0, 8).toUpperCase()}`;
}
