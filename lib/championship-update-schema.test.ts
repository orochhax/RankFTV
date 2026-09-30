import assert from "node:assert/strict";
import test from "node:test";
import { championshipUpdateSchema } from "./championship-update-schema";

const valid = {
  champId: "61212887-0228-4fcb-9f45-016f0399b01e",
  input: {
    nome: "Copa Bahia",
    descricao: "",
    regulamento: "",
    dataInicio: "2026-09-10",
    dataFim: "2026-09-11",
    inscricoesInicio: "2026-09-01",
    inscricoesFim: "2026-09-09",
    cidade: "Salvador",
    estado: "BA",
    local: "Arena",
    status: "rascunho" as const,
    usaMotorCategoria: false,
    categorias: [{ nome: "Aprendiz", genero: "mista" as const, valorInscricao: 100 }],
  },
};

test("championship update accepts the documented contract", () => {
  assert.equal(championshipUpdateSchema.safeParse(valid).success, true);
});

test("championship update rejects invalid identifiers, roles and oversized input", () => {
  assert.equal(championshipUpdateSchema.safeParse({ ...valid, champId: "not-an-id" }).success, false);
  assert.equal(championshipUpdateSchema.safeParse({
    ...valid,
    input: { ...valid.input, status: "published", descricao: "x".repeat(10_001) },
  }).success, false);
});
