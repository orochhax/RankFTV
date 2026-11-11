"use client";

import { jsPDF } from "jspdf";
import { formatBRL } from "@/lib/format";
import {
  REPORT_FIELD_DEFINITIONS,
  type FinancialHealthResult,
  type ReportFieldKey,
  type ReportRow,
} from "./financial-cockpit";
import type { ChampionshipDre } from "./championship-expenses";

export function generateExecutiveFinancialPdf(opts: {
  championshipName: string;
  startDate: string;
  endDate: string;
  dre: ChampionshipDre;
  health: FinancialHealthResult;
  fields: ReportFieldKey[];
  rows: ReportRow[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Cabeçalho executivo
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RankFTV · Relatório Financeiro Executivo", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(opts.championshipName, margin, 18.5);
  const periodLabel =
    opts.startDate || opts.endDate
      ? `Período: ${opts.startDate || "início"} até ${opts.endDate || "hoje"}`
      : "Período: Todo o campeonato";
  doc.text(periodLabel, margin, 24);

  doc.setFont("helvetica", "bold");
  doc.text(`Saúde: ${opts.health.score}/100 (${opts.health.bandLabel})`, pageWidth - margin, 18.5, {
    align: "right",
  });

  y = 36;
  doc.setTextColor(15, 23, 42);

  // Quadro resumo DRE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo Consolidado (DRE)", margin, y);
  y += 4;

  const boxWidth = (pageWidth - margin * 2 - 8) / 3;
  const dreCards = [
    { label: "Receita Líquida", val: formatBRL(opts.dre.receitaLiquida) },
    { label: "Despesas Totais", val: formatBRL(opts.dre.despesasTotais) },
    { label: `Lucro Real (${opts.dre.margemLucroPercentual}%)`, val: formatBRL(opts.dre.lucroLiquidoReal) },
  ];

  dreCards.forEach((c, idx) => {
    const x = margin + idx * (boxWidth + 4);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, boxWidth, 16, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + 3, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, x + 3, y + 12.5);
  });

  y += 24;

  // Tabela detalhada
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Movimentações filtradas (${opts.rows.length})`, margin, y);
  y += 5;

  const usableW = pageWidth - margin * 2;
  const colW = usableW / Math.max(1, opts.fields.length);

  function drawHeaderRow() {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    opts.fields.forEach((f, idx) => {
      const label = REPORT_FIELD_DEFINITIONS[f].label;
      doc.text(label.slice(0, 18), margin + idx * colW + 1.5, y + 4.8);
    });
    y += 8;
  }

  drawHeaderRow();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  const maxRows = opts.rows.slice(0, 400);
  for (const row of maxRows) {
    if (y > 276) {
      doc.addPage();
      y = 16;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
    }

    opts.fields.forEach((f, idx) => {
      let text = "";
      if (f === "secao") text = row.secaoLabel;
      else if (f === "valorBruto") text = formatBRL(row.valorBruto);
      else text = String(row[f] ?? "");
      doc.text(text.slice(0, 22), margin + idx * colW + 1.5, y + 4);
    });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 6.5;
  }

  const safeSlug = opts.championshipName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  doc.save(`rankftv-relatorio-${safeSlug || "campeonato"}.pdf`);
}
