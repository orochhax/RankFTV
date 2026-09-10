import { z } from "zod";

const optionalBounded = (max: number) => z.string().trim().max(max);
const paymentMethod = z.enum(["pix", "credito", "debito"]);
const athleteTicketPaymentChoice = z.enum(["pix", "cartao"]);
const shirt = z.enum(["PP", "P", "M", "G", "GG", "XG", "XGG"]);

export const authenticatedRegistrationCoreSchema = z.object({
  championshipId: z.uuid(),
  categoryId: z.uuid(),
  parceiroUsername: optionalBounded(30).refine(
    (value) => value === "" || /^[a-z0-9_.]{3,30}$/.test(value),
  ),
  cpfInput: optionalBounded(20).regex(/^[0-9.\-]*$/),
  metodo: paymentMethod,
  tamanhoCamisa: shirt,
  cupomCodigo: optionalBounded(80),
  legalAccepted: z.literal(true),
}).strict();

export const guestAthleteCheckoutCoreSchema = z.object({
  championshipId: z.uuid(),
  categoryId: z.uuid(),
  categoriaNome: optionalBounded(120).nullable(),
  metodoPagamento: athleteTicketPaymentChoice,
  usarMesmoEmail: z.boolean(),
  nome: z.string().trim().min(2).max(160),
  cpf: z.string().length(11).regex(/^\d+$/),
  email: z.email().max(254),
  emailConfirmacao: z.email().max(254),
  zap: z.string().regex(/^\d{10,15}$/).nullable(),
  genero: z.enum(["masculino", "feminino", "outro"]),
  nascimento: z.union([z.iso.date(), z.literal("")]).nullable(),
  camisa: shirt.nullable(),
  parceiroNome: z.string().trim().min(2).max(160),
  parceiroCpf: z.string().length(11).regex(/^\d+$/),
  parceiroEmail: z.email().max(254),
  parceiroEmailConfirmacao: z.email().max(254),
  parceiroZap: z.string().regex(/^\d{10,15}$/).nullable(),
  parceiroGenero: z.enum(["masculino", "feminino", "outro"]),
  parceiroCamisa: shirt.nullable(),
  cupomCodigo: optionalBounded(80),
  legalAccepted: z.literal(true),
}).strict();

export const spectatorCheckoutSchema = z.object({
  championshipId: z.uuid(),
  nome: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  cpf: z.string().regex(/^\d{0,11}$/),
  cupomCodigo: optionalBounded(80),
  legalAccepted: z.literal(true),
  items: z.array(z.object({
    ticketTypeId: z.uuid(),
    qty: z.number().int().min(1).max(20),
  }).strict()).min(1).max(50),
}).strict();
