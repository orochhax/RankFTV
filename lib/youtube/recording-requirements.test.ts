import test from "node:test";
import assert from "node:assert/strict";
import { getRecordingRequirements } from "./recording-requirements";

const idea = (overrides: Partial<Parameters<typeof getRecordingRequirements>[0]> = {}) => ({
  title: "Como organizar melhor o trabalho",
  summary: "Uma explicação prática para transformar planos em entregas.",
  angle: "Aplicação simples",
  format: "tutorial",
  outline: ["contexto", "exemplo", "próxima ação"],
  hook: "Você não precisa de mais uma ferramenta.",
  ...overrides,
});

test("requisitos básicos não exigem novas assinaturas", () => {
  const result = getRecordingRequirements(idea());
  assert.equal(result.monthlyTotalBrl, 0);
  assert.match(result.totalLabel, /R\$ 0\/mês/);
  assert.ok(result.tools.some((tool) => tool.access === "assinatura existente"));
});

test("Claude aparece como opção, mas não como cobrança obrigatória", () => {
  const result = getRecordingRequirements(idea({ title: "Claude Code: o que muda para quem trabalha com IA" }));
  const claude = result.tools.find((tool) => tool.name === "Claude Pro");
  assert.ok(claude);
  assert.equal(claude.required, false);
  assert.equal(result.monthlyTotalBrl, 0);
});

test("recursos premium explicitamente pedidos entram no total", () => {
  const result = getRecordingRequirements(idea({ title: "Como editar com CapCut Pro e criar thumbnail no Canva Pro" }));
  assert.equal(result.monthlyTotalBrl, 145);
  assert.ok(result.tools.some((tool) => tool.name === "CapCut Pro" && tool.required));
  assert.ok(result.tools.some((tool) => tool.name === "Canva Pro" && tool.required));
});
