import { z } from "zod";

const password = z.string().min(8).max(128);
const captchaToken = z.string().min(10).max(4_096).nullable();

export const loginInputSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  captchaToken,
}).strict();

export const signupInputSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  password,
  username: z.string().trim().regex(/^[a-z0-9_.]{3,30}$/),
  genero: z.enum(["masculino", "feminino", "outro"]),
  captchaToken: z.string().min(10).max(4_096),
  organizer: z.object({
    telefone: z.string().regex(/^\d{10,15}$/),
    cpfCnpj: z.string().regex(/^(\d{11}|\d{14})$/),
    nascimento: z.iso.date(),
  }).strict().nullable(),
}).strict();

export const passwordRecoveryInputSchema = z.object({
  email: z.email().max(254),
  captchaToken,
}).strict();

export const passwordUpdateInputSchema = z.object({
  password,
  confirmation: password,
}).strict().refine((input) => input.password === input.confirmation, {
  path: ["confirmation"],
});
