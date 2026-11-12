import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { championshipUpdateSchema } from "./championship-update-schema";

const BASE_PAYLOAD = {
  champId: "c1000000-0000-4000-8000-000000000001",
  input: {
    nome: "Open RankFTV",
    descricao: "Etapa teste",
    regulamento: "Regulamento teste",
    dataInicio: "2026-12-01",
    dataFim: "2026-12-03",
    inscricoesInicio: "2026-11-15",
    inscricoesFim: "2026-11-30",
    prevendaInicio: "2026-11-10",
    prevendaFim: "2026-11-14",
    cidade: "Salvador",
    estado: "BA",
    local: "Praia da Pitinga",
    status: "rascunho" as const,
    usaMotorCategoria: false,
    categorias: [
      {
        nome: "Open Masculino",
        genero: "masculino" as const,
        valorInscricao: 200,
      },
    ],
  },
};

describe("championshipUpdateSchema — horários opcionais", () => {
  test("aceita campeonato sem nenhum horário preenchido", () => {
    const parsed = championshipUpdateSchema.safeParse(BASE_PAYLOAD);
    assert.equal(parsed.success, true);
  });

  test("aceita todos os 4 horários opcionais em formato HH:MM válido ou vazio", () => {
    const withTimes = championshipUpdateSchema.safeParse({
      ...BASE_PAYLOAD,
      input: {
        ...BASE_PAYLOAD.input,
        horaInicio: "08:30",
        horaFim: "19:45",
        prevendaHoraInicio: "10:00",
        inscricoesHoraInicio: "",
      },
    });
    assert.equal(withTimes.success, true);
  });

  test("rejeita horário inválido fora do padrão HH:MM", () => {
    const invalid = championshipUpdateSchema.safeParse({
      ...BASE_PAYLOAD,
      input: {
        ...BASE_PAYLOAD.input,
        horaInicio: "25:99",
      },
    });
    assert.equal(invalid.success, false);
  });
});
