import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPartnerChangeEligibility,
  formatDateTimeBR,
} from "./championship-partner-change-rules";

test("elegibilidade de troca de dupla - regulamento proíbe troca", () => {
  const result = checkPartnerChangeEligibility({
    permiteTrocaDupla: false,
    statusPagamento: "pago",
    checkedIn: false,
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /regulamento deste campeonato não permite a alteração/);
});

test("elegibilidade de troca de dupla - dentro do prazo estipulado pelo organizador", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const futureDeadline = "2026-11-12T18:00:00Z";
  const result = checkPartnerChangeEligibility(
    {
      permiteTrocaDupla: true,
      prazoLimiteTrocaDupla: futureDeadline,
      statusPagamento: "pago",
      checkedIn: false,
      dataInicio: "2026-11-15",
    },
    now,
  );
  assert.equal(result.allowed, true);
  assert.ok(result.deadlineFormatted);
});

test("elegibilidade de troca de dupla - prazo estipulado expirou", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const pastDeadline = "2026-11-12T18:00:00Z";
  const result = checkPartnerChangeEligibility(
    {
      permiteTrocaDupla: true,
      prazoLimiteTrocaDupla: pastDeadline,
      statusPagamento: "pago",
      checkedIn: false,
    },
    now,
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /prazo limite para troca de dupla encerrou/);
});

test("elegibilidade de troca de dupla - chaveamento confirmado bloqueia troca", () => {
  const result = checkPartnerChangeEligibility({
    permiteTrocaDupla: true,
    statusPagamento: "pago",
    checkedIn: false,
    bracketConfirmedAt: "2026-11-09T10:00:00Z",
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /chaveamento desta categoria já foi confirmado/);
});

test("elegibilidade de troca de dupla - check-in já realizado bloqueia troca", () => {
  const result = checkPartnerChangeEligibility({
    permiteTrocaDupla: true,
    statusPagamento: "pago",
    checkedIn: true,
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /após a realização do check-in/);
});

test("elegibilidade de troca de dupla - evento já iniciado no fuso de São Paulo", () => {
  const now = new Date("2026-11-10T15:00:00-03:00");
  const result = checkPartnerChangeEligibility(
    {
      permiteTrocaDupla: true,
      statusPagamento: "pago",
      checkedIn: false,
      dataInicio: "2026-11-10",
    },
    now,
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /campeonato já começou/);
});
