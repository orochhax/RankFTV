export type AthleteTicketPaymentChoice = "pix" | "cartao";

export function parseAthleteTicketPaymentChoice(value: unknown): AthleteTicketPaymentChoice | null {
  return value === "pix" || value === "cartao" ? value : null;
}

export function athleteTicketInitialBillingType(
  choice: AthleteTicketPaymentChoice,
  isFree: boolean,
): "PIX" | "CREDIT_CARD" | null {
  if (isFree) return null;
  return choice === "pix" ? "PIX" : "CREDIT_CARD";
}

/** A cobrança é criada antes do redirect, seja Pix ou fatura de cartão Asaas. */
export function shouldCreateAthleteTicketCharge(isFree: boolean): boolean {
  return !isFree;
}
