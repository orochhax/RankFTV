import { z } from "zod";

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const cpf = z.string().trim().min(11).max(18).regex(/^[0-9.\-]+$/);
const isoDate = z.iso.date();

export const arenaRentalPaymentSchema = z.object({
  planId: z.uuid(),
  handle: boundedText(100).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  data: isoDate,
  hora: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cpf,
  tipo: z.literal("credito"),
}).strict();

export const arenaDailyPaymentSchema = arenaRentalPaymentSchema
  .omit({ hora: true })
  .strict();

export const arenaStoredCardRemovalSchema = z.object({
  arenaId: z.uuid(),
}).strict();

export function invalidPaymentInput() {
  return { ok: false as const, error: "Dados de pagamento inválidos. Revise o formulário." };
}
