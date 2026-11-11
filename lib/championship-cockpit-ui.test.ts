import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Fase 1A: rotas financeiras compartilham loader único e CentralFinanceiraClient em largura wide", () => {
  const fin = source("app/painel/campeonatos/[id]/financeiro/page.tsx");
  const desp = source("app/painel/campeonatos/[id]/despesas/page.tsx");
  const rel = source("app/painel/campeonatos/[id]/relatorios/page.tsx");

  for (const code of [fin, desp, rel]) {
    assert.match(code, /loadChampionshipFinancialCockpitData/);
    assert.match(code, /<PageContainer width="wide"/);
    assert.match(code, /<CentralFinanceiraClient/);
  }

  assert.match(fin, /resolveFinancialTab\(tab\)/);
  assert.match(desp, /initialTab="despesas"/);
  assert.match(rel, /initialTab="relatorios"/);
});

test("Fase 1A: gráficos, saúde financeira e exportador customizado preservam tema claro puro e helpers puros", () => {
  const charts = source("components/painel/FinancialCharts.tsx");
  const health = source("components/painel/FinancialHealthCard.tsx");
  const relatorios = source("components/painel/RelatoriosCustomPanel.tsx");
  const central = source("components/painel/CentralFinanceiraClient.tsx");
  const pdf = source("lib/financial-pdf-export.ts");

  assert.match(charts, /function buildChartSeries\(/);
  assert.match(relatorios, /SECTION_OPTIONS/);
  assert.match(relatorios, /generateExecutiveFinancialPdf/);
  assert.match(pdf, /export function generateExecutiveFinancialPdf\(/);

  for (const code of [charts, health, relatorios, central]) {
    assert.doesNotMatch(code, /\bdark:/);
  }
});

test("Fase 1B: Visão Geral do campeonato usa Pulso do torneio, Radar do organizador e tabela correta de espera", () => {
  const overview = source("app/painel/campeonatos/[id]/page.tsx");
  const nav = source("components/painel/championship-nav-items.ts");

  assert.match(overview, /Pulso do torneio/);
  assert.match(overview, /Radar do organizador/);
  assert.match(overview, /championship_category_waitlist/);
  assert.doesNotMatch(overview, /\.from\("championship_waitlist"\)/);
  assert.doesNotMatch(overview, /\bdark:/);
  assert.match(nav, /description:/);
});

test("Fase 2: Competição, Edição em abas, Lista de espera e Camisas mantêm navegação segura e zero alert()", () => {
  const compTabs = source("components/painel/CompeticaoTabsHeader.tsx");
  const quadrasBoard = source("components/painel/QuadrasBoardClient.tsx");
  const chaveamento = source("app/painel/campeonatos/[id]/chaveamento/page.tsx");
  const editarForm = source("components/painel/EditarCampeonatoForm.tsx");
  const listaEspera = source("components/painel/ListaEsperaClient.tsx");
  const camisas = source("components/camisas/CamisasClient.tsx");

  assert.match(compTabs, /Operação por Quadra/);
  assert.match(quadrasBoard, /atualizarOperacaoPartida/);
  assert.match(chaveamento, /CompeticaoTabsHeader/);
  assert.doesNotMatch(chaveamento, /\/inscricoes\b/);
  assert.match(editarForm, /role="alert"/);
  assert.doesNotMatch(editarForm, /\balert\(/);
  assert.match(listaEspera, /convidarProximoDaLista/);
  assert.doesNotMatch(camisas, /\bdark:/);
});

test("Fase 3: Comercial, Check-in, Equipe, Comunicação e Plateia usam headers de sub-rotas e superfícies brancas", () => {
  const comTabs = source("components/painel/ComercialTabsHeader.tsx");
  const lotes = source("app/painel/campeonatos/[id]/lotes/page.tsx");
  const cupons = source("app/painel/campeonatos/[id]/cupons/page.tsx");
  const checkin = source("app/painel/campeonatos/[id]/checkin/page.tsx");
  const equipe = source("components/painel/EquipeClient.tsx");
  const comunicacao = source("components/painel/ComunicacaoClient.tsx");
  const comunicacaoPage = source("app/painel/campeonatos/[id]/comunicacao/page.tsx");
  const plateiaTabs = source("components/plateia/PlateiaTabsHeader.tsx");
  const plateiaPage = source("app/painel/campeonatos/[id]/plateia/page.tsx");
  const plateiaLista = source("app/painel/campeonatos/[id]/plateia/lista/page.tsx");
  const plateiaFin = source("app/painel/campeonatos/[id]/plateia/financeiro/page.tsx");

  assert.match(comTabs, /Lotes & Viradas/);
  assert.match(lotes, /ComercialTabsHeader/);
  assert.match(cupons, /ComercialTabsHeader/);
  assert.match(comunicacaoPage, /<PageContainer width="wide"/);
  assert.match(plateiaTabs, /Lista & Portaria/);

  for (const code of [
    checkin,
    equipe,
    comunicacao,
    plateiaPage,
    plateiaLista,
    plateiaFin,
  ]) {
    assert.doesNotMatch(code, /\bdark:/);
  }
});
