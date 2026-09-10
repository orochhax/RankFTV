import { z } from "zod";

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const cardNumber = z.string().trim().min(12).max(24).regex(/^[0-9 -]+$/);
const expiryMonth = z.string().trim().regex(/^(0?[1-9]|1[0-2])$/);
const expiryYear = z.string().trim().regex(/^\d{2}(\d{2})?$/);
const cvv = z.string().trim().regex(/^\d{3,4}$/);
const cpf = z.string().trim().min(11).max(18).regex(/^[0-9.\-]+$/);
const cep = z.string().trim().min(8).max(10).regex(/^[0-9-]+$/);
const paymentType = z.enum(["credito", "debito"]);
const isoDate = z.iso.date();

const cardFields = {
  numero: cardNumber,
  nomeTitular: boundedText(120),
  mesValidade: expiryMonth,
  anoValidade: expiryYear,
  cvv,
  cep,
  numeroEndereco: boundedText(40),
};

export const registrationCardPaymentSchema = z.object({
  registrationId: z.uuid(),
  tipo: paymentType,
  ...cardFields,
  parcelas: z.number().int().min(1).max(12),
  telefone: z.string().trim().min(10).max(24),
  complemento: z.string().trim().max(120),
}).strict();

export const athleteTicketCardPaymentSchema = registrationCardPaymentSchema
  .omit({ registrationId: true })
  .extend({
    ticketId: z.uuid(),
    accessToken: z.string().trim().min(32).max(160),
  })
  .strict();

export const arenaRentalPaymentSchema = z.object({
  planId: z.uuid(),
  handle: boundedText(100).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  data: isoDate,
  hora: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cpf,
  tipo: paymentType,
  ...cardFields,
}).strict();

export const arenaDailyPaymentSchema = arenaRentalPaymentSchema
  .omit({ hora: true })
  .strict();

export const arenaSubscriptionPaymentSchema = z.object({
  planId: z.uuid(),
  handle: boundedText(100).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  cpf,
  numero: cardNumber,
  nomeTitular: boundedText(120),
  mesValidade: expiryMonth,
  anoValidade: expiryYear,
  cvv,
  cep,
  numeroEndereco: boundedText(40),
}).strict();

export const arenaStoredCardSchema = z.object({
  arenaId: z.uuid(),
  handle: boundedText(100).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  cpf,
  numero: cardNumber,
  nomeTitular: boundedText(120),
  mesValidade: expiryMonth,
  anoValidade: expiryYear,
  cvv,
  cep,
  numeroEndereco: boundedText(40),
}).strict();

export const arenaStoredCardRemovalSchema = z.object({
  arenaId: z.uuid(),
}).strict();

export function invalidPaymentInput() {
  return { ok: false as const, error: "Dados de pagamento inválidos. Revise o formulário." };
}
