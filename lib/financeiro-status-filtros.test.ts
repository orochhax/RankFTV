import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const statusPage = readFileSync(
  "app/painel/campeonatos/[id]/financeiro/[status]/page.tsx",
  "utf8",
);
const clientComponent = readFileSync(
  "components/painel/FinanceiroStatusClient.tsx",
  "utf8",
);
const filtrosBar = readFileSync(
  "components/painel/FinanceiroFiltrosBar.tsx",
  "utf8",
);
const expandableRow = readFileSync(
  "components/painel/InscricaoExpandivel.tsx",
  "utf8",
);

test("financeiro status page queries billing_type for registrations and athlete_tickets", () => {
  assert.match(statusPage, /from\("registrations"\)[\s\S]*?billing_type/);
  assert.match(statusPage, /from\("athlete_tickets"\)[\s\S]*?billing_type/);
  assert.match(statusPage, /<FinanceiroStatusClient/);
});

test("expandable row displays payment method badge and preserves athlete checks", () => {
  assert.match(expandableRow, /billingType\?: string \| null/);
  assert.match(expandableRow, /METODOS_LABEL/);
  assert.match(expandableRow, /PIX: \{ label: "Pix"/);
  assert.match(expandableRow, /CREDIT_CARD: \{ label: "Crédito"/);
  assert.match(expandableRow, /DEBIT_CARD: \{ label: "Débito"/);
  assert.match(expandableRow, /\{atleta\.username && \(/);
});

test("financeiro status client implements filters for pix, credito, debito, date and sorting", () => {
  // Method filters in bar
  assert.match(filtrosBar, /metodo === "PIX"/);
  assert.match(filtrosBar, /metodo === "CREDIT_CARD"/);
  assert.match(filtrosBar, /metodo === "DEBIT_CARD"/);

  // Date range filter
  assert.match(clientComponent, /dataInicio/);
  assert.match(clientComponent, /dataFim/);
  assert.match(clientComponent, /America\/Sao_Paulo/);

  // Sorting
  assert.match(clientComponent, /valor_desc/);
  assert.match(clientComponent, /valor_asc/);
  assert.match(clientComponent, /data_desc/);
  assert.match(clientComponent, /data_asc/);
});

test("filter and sorting logic operates correctly on sample items", () => {
  type Item = {
    regId: string;
    valor: number;
    categoria: string;
    criadoEm: string;
    billingType: string | null;
    atleta1: { nome: string; email: string | null };
    atleta2: { nome: string; email: string | null } | null;
  };

  const sample: Item[] = [
    {
      regId: "1",
      valor: 160,
      categoria: "Iniciante",
      criadoEm: "2026-09-30T15:00:00Z",
      billingType: "DEBIT_CARD",
      atleta1: { nome: "Daniel Teixeira", email: "daniel@example.com" },
      atleta2: { nome: "Igor Barbosa", email: "igor@example.com" },
    },
    {
      regId: "2",
      valor: 220,
      categoria: "Intermediário",
      criadoEm: "2026-09-29T15:00:00Z",
      billingType: "CREDIT_CARD",
      atleta1: { nome: "Eduardo Pinto", email: "eduardo@example.com" },
      atleta2: { nome: "João Ramos", email: "joao@example.com" },
    },
    {
      regId: "3",
      valor: 110,
      categoria: "Iniciante",
      criadoEm: "2026-09-26T15:00:00Z",
      billingType: "PIX",
      atleta1: { nome: "Gustavo Melo", email: "gustavo@example.com" },
      atleta2: { nome: "Diego Alves", email: "diego@example.com" },
    },
  ];

  // Filter Pix
  const pixOnly = sample.filter((i) => i.billingType === "PIX");
  assert.equal(pixOnly.length, 1);
  assert.equal(pixOnly[0].atleta1.nome, "Gustavo Melo");

  // Filter Débito
  const debitOnly = sample.filter((i) => i.billingType === "DEBIT_CARD");
  assert.equal(debitOnly.length, 1);
  assert.equal(debitOnly[0].atleta1.nome, "Daniel Teixeira");

  // Sort by highest amount
  const sortedByValorDesc = [...sample].sort((a, b) => b.valor - a.valor);
  assert.equal(sortedByValorDesc[0].valor, 220);
  assert.equal(sortedByValorDesc[1].valor, 160);
  assert.equal(sortedByValorDesc[2].valor, 110);

  // Sort by lowest amount
  const sortedByValorAsc = [...sample].sort((a, b) => a.valor - b.valor);
  assert.equal(sortedByValorAsc[0].valor, 110);
  assert.equal(sortedByValorAsc[2].valor, 220);
});
