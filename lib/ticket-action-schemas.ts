import { z } from "zod";

export const spectatorOwnershipChangeSchema = z.object({
  ticketId: z.uuid(),
  accessToken: z.uuid(),
  compradorNome: z.string().trim().min(2).max(160),
  compradorEmail: z.email().max(254),
  compradorCpf: z.string().trim().min(11).max(18).regex(/^[0-9.\-]+$/),
}).strict();

export const spectatorCancellationSchema = z.object({
  ticketId: z.uuid(),
  accessToken: z.uuid(),
}).strict();

export const athleteCredentialReplacementSchema = z.object({
  championshipId: z.uuid(),
  credentialId: z.uuid(),
}).strict();

export const championshipWaitlistSchema = z.object({
  championshipId: z.uuid(),
  categoryId: z.uuid(),
  email: z.email().max(254),
  consent: z.boolean(),
}).strict();
