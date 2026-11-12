import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveArenaTierFromSubscription } from "./arena-subscription";
import { DEMO_ARENA_HANDLE, DEMO_ARENA_ID, isDemoArenaIdentifier } from "./arena-demo";
import { buildRadarEvasaoReport } from "./arena-radar-evasao-core";

describe("Arena Pro subscription resolver", () => {
  test("libera Plano Pro quando assinatura está pro + ativo ou trial", () => {
    assert.equal(resolveArenaTierFromSubscription({ plano: "pro", status: "ativo" }), "pro");
    assert.equal(resolveArenaTierFromSubscription({ plano: "PRO", status: "trial" }), "pro");
  });

  test("retorna Start para básico, inadimplente, cancelado ou ausente", () => {
    assert.equal(resolveArenaTierFromSubscription(null), "start");
    assert.equal(resolveArenaTierFromSubscription({ plano: "basico", status: "ativo" }), "start");
    assert.equal(resolveArenaTierFromSubscription({ plano: "pro", status: "inadimplente" }), "start");
    assert.equal(resolveArenaTierFromSubscription({ plano: "pro", status: "cancelado" }), "start");
  });
});

describe("Arena demo identifier guard", () => {
  test("identifica ID e handle oficiais da arena demo Rank Football", () => {
    assert.equal(isDemoArenaIdentifier(DEMO_ARENA_ID), true);
    assert.equal(isDemoArenaIdentifier(DEMO_ARENA_HANDLE), true);
    assert.equal(isDemoArenaIdentifier("  RANK-FOOTBALL "), true);
    assert.equal(isDemoArenaIdentifier("outra-arena"), false);
    assert.equal(isDemoArenaIdentifier(null), false);
  });
});

describe("Radar Anti-Evasão (buildRadarEvasaoReport)", () => {
  test("classifica corretamente alunos em risco crítico, atenção e saudáveis", () => {
    const report = buildRadarEvasaoReport({
      arenaNome: "Rank Football",
      todayISO: "2026-11-11",
      students: [
        {
          userId: "u-critico",
          nome: "Lucas Falta Muito",
          username: "lucas_f",
          telefone: "73999001122",
          dataEntrada: "2026-01-10",
          valorMensalidade: 260,
          planoNome: "Plano 3x Semana",
        },
        {
          userId: "u-atencao",
          nome: "Marina Queda Ritmo",
          username: "marina_q",
          telefone: null,
          dataEntrada: "2026-02-01",
          valorMensalidade: 190,
          planoNome: "Plano 2x Semana",
        },
        {
          userId: "u-saudavel",
          nome: "Pedro Assiduo",
          username: "pedro_a",
          telefone: "73999003344",
          dataEntrada: "2025-11-15",
          valorMensalidade: 320,
          planoNome: "Plano Ilimitado",
        },
      ],
      attendance: [
        // Critico: treinava no mês passado, 0 nos últimos 25 dias
        { userId: "u-critico", data: "2026-10-05", status: "presente" },
        { userId: "u-critico", data: "2026-10-07", status: "presente" },
        { userId: "u-critico", data: "2026-10-09", status: "presente" },
        { userId: "u-critico", data: "2026-10-12", status: "presente" },
        // Atenção: último treino há 13 dias
        { userId: "u-atencao", data: "2026-10-29", status: "presente" },
        // Saudável: treinou há 1 dia
        { userId: "u-saudavel", data: "2026-11-10", status: "presente" },
      ],
      charges: [
        { userId: "u-critico", statusPagamento: "pendente", competencia: "2026-11", valor: 260 },
      ],
    });

    assert.equal(report.resumo.totalAtivos, 3);
    assert.equal(report.resumo.riscoCritico, 1);
    assert.equal(report.resumo.riscoAtencao, 1);
    assert.equal(report.resumo.saudaveis, 1);
    assert.equal(report.resumo.receitaMensalEmRisco, 450);
    assert.equal(report.alunos[0].userId, "u-critico");
    assert.equal(report.alunos[0].risco, "critico");
    assert.equal(report.alunos[0].diasSemTreinar, 30);
    assert.ok(report.alunos[0].mensagemWhatsapp.includes("Lucas"));
    assert.equal(report.alunos[1].risco, "atencao");
    assert.equal(report.alunos[2].risco, "saudavel");
  });
});
