import "server-only";

import { createHash, randomBytes } from "node:crypto";

const PRODUCTION_ATHLETE_CHECKOUT_RESERVATION_MINUTES = 15;

function sandboxReservationMinutes(): number | null {
  const value = Number.parseInt(process.env.ATHLETE_CHECKOUT_RESERVATION_MINUTES ?? "", 10);
  if (!Number.isInteger(value) || value < 1 || value > PRODUCTION_ATHLETE_CHECKOUT_RESERVATION_MINUTES) {
    return null;
  }
  return value;
}

// O prazo menor existe exclusivamente para testes locais no Sandbox. Em
// produção, a reserva continua invariavelmente em quinze minutos, mesmo se
// uma variável de ambiente for configurada por engano.
export const ATHLETE_CHECKOUT_RESERVATION_MINUTES =
  process.env.NODE_ENV === "development"
    ? (sandboxReservationMinutes() ?? PRODUCTION_ATHLETE_CHECKOUT_RESERVATION_MINUTES)
    : PRODUCTION_ATHLETE_CHECKOUT_RESERVATION_MINUTES;

export type AthleteCheckoutReservation = {
  id: string;
  categoryId: string;
  expiresAt: string;
  serverNow: string;
  price: number;
  pricingTierId: string | null;
  reused: boolean;
};

export function athleteCheckoutCookieName(championshipId: string): string {
  return `rankftv_athlete_checkout_${championshipId}`;
}

export function generateCheckoutReservationToken(): string {
  return randomBytes(32).toString("hex");
}

export function isCheckoutReservationToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function hashCheckoutReservationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseAthleteCheckoutReservation(value: unknown): AthleteCheckoutReservation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string"
    || typeof row.categoryId !== "string"
    || typeof row.expiresAt !== "string"
    || typeof row.serverNow !== "string"
  ) return null;

  const price = Number(row.price);
  if (!Number.isFinite(price) || price < 0) return null;

  return {
    id: row.id,
    categoryId: row.categoryId,
    expiresAt: row.expiresAt,
    serverNow: row.serverNow,
    price,
    pricingTierId: typeof row.pricingTierId === "string" ? row.pricingTierId : null,
    reused: row.reused === true,
  };
}

export function checkoutReservationErrorMessage(message: string): string {
  if (message.includes("checkout_category_sold_out")) return "As vagas desta categoria acabaram de esgotar.";
  if (message.includes("checkout_pricing_tiers_sold_out")) return "O lote desta categoria acabou de esgotar.";
  if (message.includes("checkout_sales_closed")) return "As inscrições não estão abertas.";
  if (message.includes("checkout_category_not_found")) return "Categoria não encontrada.";
  return "Não foi possível reservar a vaga. Atualize a página e tente novamente.";
}
