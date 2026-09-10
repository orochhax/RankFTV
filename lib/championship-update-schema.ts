import { z } from "zod";

const optionalUrl = z.union([z.url(), z.literal("")]).nullish();

export const championshipIdSchema = z.uuid();

export const championshipCategoryUpdateSchema = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  genero: z.enum(["masculino", "feminino", "mista"]),
  valorInscricao: z.number().finite().min(0).max(1_000_000),
  maxDuplas: z.number().int().min(2).max(4_096).optional(),
  _delete: z.boolean().optional(),
}).strict();

export const championshipUpdateSchema = z.object({
  champId: championshipIdSchema,
  input: z.object({
    nome: z.string().trim().min(1).max(160),
    descricao: z.string().max(10_000),
    regulamento: z.string().max(100_000),
    regulamentoPdfUrl: optionalUrl,
    dataInicio: z.string().min(1).max(40),
    dataFim: z.string().min(1).max(40),
    inscricoesInicio: z.string().max(40).optional(),
    inscricoesFim: z.string().max(40).optional(),
    prevendaInicio: z.string().max(40).optional(),
    prevendaFim: z.string().max(40).optional(),
    cidade: z.string().trim().min(1).max(120),
    estado: z.string().trim().min(2).max(80),
    local: z.string().max(240),
    liveUrl: optionalUrl,
    status: z.enum(["rascunho", "inscricoes_abertas", "em_andamento", "encerrado"]),
    usaMotorCategoria: z.boolean(),
    categorias: z.array(championshipCategoryUpdateSchema).min(1).max(256),
  }).strict(),
}).strict();
