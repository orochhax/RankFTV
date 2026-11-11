"use client";

import { useState } from "react";
import { Calendar, Download, FileSpreadsheet, FileText, Loader2, RefreshCw } from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  REPORT_FIELD_DEFINITIONS,
  VALID_REPORT_FIELDS,
  type FinancialHealthResult,
  type ReportFieldKey,
  type ReportRow,
  type ReportSectionKey,
} from "@/lib/financial-cockpit";
import { generateExecutiveFinancialPdf } from "@/lib/financial-pdf-export";
import type { ChampionshipDre } from "@/lib/championship-expenses";

const SECTION_OPTIONS: Array<{ key: ReportSectionKey; label: string; hint: string }> = [
  { key: "inscricoes", label: "Inscrições de Atletas", hint: "Duplas pagas, pendentes e estornadas" },
  { key: "plateia", label: "Ingressos de Plateia", hint: "Pedidos de espectadores e lotes" },
  { key: "despesas", label: "Despesas & Custos", hint: "Fornecedores, contas pagas e a vencer" },
  { key: "repasses", label: "Repasses & Saques", hint: "Transferências Pix da carteira" },
];

const LEGACY_PRESETS = [
  { tipo: "vendas", label: "Vendas gerais (CSV)" },
  { tipo: "presenca", label: "Lista de presença (CSV)" },
  { tipo: "categorias", label: "Resumo por categoria (CSV)" },
  { tipo: "repasses", label: "Extrato de repasses (CSV)" },
] as const;

export function RelatoriosCustomPanel({
  champId,
  championshipName,
  dre,
  health,
}: {
  champId: string;
  championshipName: string;
  dre: ChampionshipDre;
  health: FinancialHealthResult;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState<ReportSectionKey[]>([
    "inscricoes",
    "plateia",
    "despesas",
    "repasses",
  ]);
  const [fields, setFields] = useState<ReportFieldKey[]>([...VALID_REPORT_FIELDS]);
  const [previewRows, setPreviewRows] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(key: ReportSectionKey) {
    setSections((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
    setPreviewRows(null);
  }

  function toggleField(key: ReportFieldKey) {
    setFields((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  }

  function applyQuickDays(days: number | null) {
    if (days === null) {
      setStartDate("");
      setEndDate("");
      setPreviewRows(null);
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    setStartDate(fmt(start));
    setEndDate(fmt(end));
    setPreviewRows(null);
  }

  function buildUrl(format: "csv" | "json") {
    const params = new URLSearchParams();
    params.set("format", format);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("sections", sections.join(","));
    params.set("fields", fields.join(","));
    return `/api/campeonatos/${champId}/relatorios/export?${params.toString()}`;
  }

  async function fetchPreviewRows(): Promise<ReportRow[] | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl("json"), { cache: "no-store" });
      if (!res.ok) {
        setError("Não foi possível carregar os dados filtrados.");
        return null;
      }
      const data = (await res.json()) as { rows?: ReportRow[] };
      const rows = data.rows ?? [];
      setPreviewRows(rows);
      return rows;
    } catch {
      setError("Erro de rede ao gerar prévia do relatório.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    const rows = previewRows ?? (await fetchPreviewRows());
    if (!rows) return;
    generateExecutiveFinancialPdf({
      championshipName,
      startDate,
      endDate,
      dre,
      health,
      fields,
      rows,
    });
  }

  const previewSum = (previewRows ?? []).reduce((acc, r) => acc + r.valorBruto, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* Coluna Esquerda: Construtor Personalizado */}
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h3 className="text-base font-bold text-ink">Construtor de Relatório Personalizado</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Escolha o período exato (horário de Brasília), os blocos financeiros e as colunas desejadas.
            </p>
          </div>

          {/* Período */}
          <div className="space-y-3 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Calendar className="size-3.5 text-blue-600" />
                1. Intervalo de datas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Todo evento", days: null },
                  { label: "Últimos 7 dias", days: 7 },
                  { label: "Últimos 30 dias", days: 30 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyQuickDays(preset.days)}
                    className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-ink-muted">
                Data inicial
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreviewRows(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <label className="text-xs font-medium text-ink-muted">
                Data final
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreviewRows(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
            </div>
          </div>

          {/* Seções */}
          <div className="space-y-3 border-t border-border/70 pt-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
              2. O que incluir no relatório
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SECTION_OPTIONS.map((opt) => {
                const checked = sections.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleSection(opt.key)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      checked
                        ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30"
                        : "border-border bg-surface hover:bg-surface-2/60"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${checked ? "text-blue-800" : "text-ink"}`}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colunas / Campos */}
          <div className="space-y-3 border-t border-border/70 pt-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
              3. Campos visíveis
            </span>
            <div className="flex flex-wrap gap-2">
              {VALID_REPORT_FIELDS.map((fieldKey) => {
                const active = fields.includes(fieldKey);
                return (
                  <button
                    key={fieldKey}
                    type="button"
                    onClick={() => toggleField(fieldKey)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-border bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    {REPORT_FIELD_DEFINITIONS[fieldKey].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Prévia & Downloads */}
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink">Exportação & Prévia</h3>
              <p className="text-xs text-ink-muted">Dados oficiais auditados no servidor.</p>
            </div>
            <button
              type="button"
              onClick={fetchPreviewRows}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Visualizar
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-muted">Período</span>
              <span className="font-semibold text-ink">
                {startDate || endDate ? `${startDate || "início"} → ${endDate || "hoje"}` : "Completo"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Módulos</span>
              <span className="font-semibold text-ink">{sections.length} selecionado(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Colunas</span>
              <span className="font-semibold text-ink">{fields.length} campo(s)</span>
            </div>
            {previewRows && (
              <>
                <div className="my-1 border-t border-border/70 pt-1.5 flex justify-between">
                  <span className="text-ink-muted">Registros encontrados</span>
                  <span className="font-bold text-blue-700">{previewRows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Saldo líquido filtrado</span>
                  <span className="font-bold text-emerald-700">{formatBRL(previewSum)}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText className="size-4" />
              Gerar PDF Executivo (A4)
            </button>

            <a
              href={buildUrl("csv")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Baixar CSV Personalizado (Excel)
            </a>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Downloads rápidos individuais
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {LEGACY_PRESETS.map((item) => (
                <a
                  key={item.tipo}
                  href={`/api/campeonatos/${champId}/relatorios/${item.tipo}`}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-blue-700"
                >
                  <span>{item.label}</span>
                  <Download className="size-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela rápida quando houver prévia carregada */}
      {previewRows && previewRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 overflow-x-auto">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
            Amostra ao vivo (primeiros {Math.min(12, previewRows.length)} de {previewRows.length} registros)
          </p>
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                {fields.map((f) => (
                  <th key={f} className="pb-2 pr-3 font-semibold">
                    {REPORT_FIELD_DEFINITIONS[f].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {previewRows.slice(0, 12).map((row, idx) => (
                <tr key={idx}>
                  {fields.map((f) => (
                    <td key={f} className="py-2 pr-3 text-ink">
                      {f === "secao"
                        ? row.secaoLabel
                        : f === "valorBruto"
                          ? formatBRL(row.valorBruto)
                          : row[f]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
