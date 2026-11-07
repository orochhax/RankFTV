import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_PLATFORM_TIERS,
  ARENA_BENEFITS_COMPARISON,
  avaliarCapacidadeArena,
} from "./arena-platform-plans";

describe("Planos da Plataforma para Arenas (arena-platform-plans)", () => {
  test("define o Plano Start com limite de 30 alunos, taxa recorrente de R$ 4,90 e alerta em 25 alunos", () => {
    const start = ARENA_PLATFORM_TIERS.start;
    assert.equal(start.precoMensal, 0);
    assert.equal(start.taxaPorAlunoMes, 4.90);
    assert.equal(start.limiteAlunos, 30);
    assert.equal(start.limiteAlertaAlunos, 25);
  });

  test("define o Plano Pro com R$ 139/mês fixo e alunos ilimitados", () => {
    const pro = ARENA_PLATFORM_TIERS.pro;
    assert.equal(pro.precoMensal, 139.00);
    assert.equal(pro.taxaPorAlunoMes, 0);
    assert.equal(pro.limiteAlunos, null);
    assert.equal(pro.limiteAlertaAlunos, null);
  });

  test("posiciona o Selo de Verificado estrategicamente na posição #3 da lista de benefícios", () => {
    assert.equal(ARENA_BENEFITS_COMPARISON[2].id, "selo_verificado");
    assert.ok(ARENA_BENEFITS_COMPARISON[2].titulo.includes("Selo de Verificado"));
    assert.equal(ARENA_BENEFITS_COMPARISON[2].destaque, true);
  });

  test("esclarece explicitamente na tabela que a taxa de R$ 4,90 do Start é mensal recorrente", () => {
    const taxaItem = ARENA_BENEFITS_COMPARISON.find((b) => b.id === "taxa_aluno");
    assert.ok(taxaItem?.startValor.includes("mês"));
    assert.ok(taxaItem?.startValor.includes("recorrente"));
  });

  test("avalia capacidade no Plano Start abaixo de 25 alunos sem alertas nem bloqueio", () => {
    const status = avaliarCapacidadeArena(15, "start");
    assert.equal(status.isAviso, false);
    assert.equal(status.isBloqueado, false);
    assert.equal(status.vagasRestantes, 15);
    assert.equal(status.percentualOcupacao, 50);
  });

  test("ativa aviso preventivo no Plano Start a partir de 25 alunos (<= 5 vagas restantes)", () => {
    const status25 = avaliarCapacidadeArena(25, "start");
    assert.equal(status25.isAviso, true);
    assert.equal(status25.isBloqueado, false);
    assert.equal(status25.vagasRestantes, 5);

    const status29 = avaliarCapacidadeArena(29, "start");
    assert.equal(status29.isAviso, true);
    assert.equal(status29.isBloqueado, false);
    assert.equal(status29.vagasRestantes, 1);
    assert.ok(status29.mensagem.includes("restam apenas 1 vagas"));
  });

  test("bloqueia novas inscrições aos 30 alunos no Plano Start", () => {
    const status30 = avaliarCapacidadeArena(30, "start");
    assert.equal(status30.isBloqueado, true);
    assert.equal(status30.vagasRestantes, 0);
    assert.ok(status30.mensagem.includes("Limite de 30 alunos atingido"));

    const status35 = avaliarCapacidadeArena(35, "start");
    assert.equal(status35.isBloqueado, true);
    assert.equal(status35.vagasRestantes, 0);
  });

  test("mantém capacidade sempre liberada no Plano Pro com qualquer número de alunos", () => {
    const status = avaliarCapacidadeArena(120, "pro");
    assert.equal(status.isAviso, false);
    assert.equal(status.isBloqueado, false);
    assert.equal(status.limiteMaximo, null);
    assert.equal(status.vagasRestantes, null);
  });
});
