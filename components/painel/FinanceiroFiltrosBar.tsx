"use client";

import { Search, X, Calendar, ArrowUpDown } from "lucide-react";

export type MetodoTipo = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
export type OrdemOpcao = "data_desc" | "data_asc" | "valor_desc" | "valor_asc";

type Props = {
  metodos: MetodoTipo[];
  counts: { todos: number; PIX: number; CREDIT_CARD: number; DEBIT_CARD: number };
  busca: string;
  dataInicio: string;
  dataFim: string;
  ordem: OrdemOpcao;
  temFiltroAtivo: boolean;
  totalFiltrado: number;
  onToggleMetodo: (metodo: MetodoTipo) => void;
  onSelectTodos: () => void;
  onBuscaChange: (busca: string) => void;
  onDataInicioChange: (data: string) => void;
  onDataFimChange: (data: string) => void;
  onOrdemChange: (ordem: OrdemOpcao) => void;
  onReset: () => void;
};

export function FinanceiroFiltrosBar({
  metodos,
  counts,
  busca,
  dataInicio,
  dataFim,
  ordem,
  temFiltroAtivo,
  totalFiltrado,
  onToggleMetodo,
  onSelectTodos,
  onBuscaChange,
  onDataInicioChange,
  onDataFimChange,
  onOrdemChange,
  onReset,
}: Props) {
  const isTodos = metodos.length === 0;
  const isPix = metodos.includes("PIX");
  const isCredito = metodos.includes("CREDIT_CARD");
  const isDebito = metodos.includes("DEBIT_CARD");

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-black/5">
      {/* Linha 1: Filtro rápido por Método de Pagamento (Multi-seleção) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Forma de pagamento
          </span>
          <span className="text-[11px] text-gray-400">
            Clique para combinar mais de uma forma
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectTodos}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isTodos
                ? "bg-brand text-white shadow-xs"
                : "bg-surface-2 text-ink hover:bg-border/40 ring-1 ring-inset ring-border"
            }`}
          >
            <span>Todos</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                isTodos ? "bg-brand-hover text-white" : "bg-border/60 text-ink"
              }`}
            >
              {counts.todos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleMetodo("PIX")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isPix
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
            }`}
          >
            <span>⚡ Pix</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                isPix ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {counts.PIX}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleMetodo("CREDIT_CARD")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isCredito
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
            }`}
          >
            <span>💳 Cartão de Crédito</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                isCredito ? "bg-sky-700 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {counts.CREDIT_CARD}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleMetodo("DEBIT_CARD")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isDebito
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
            }`}
          >
            <span>🏦 Cartão de Débito</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                isDebito ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {counts.DEBIT_CARD}
            </span>
          </button>
        </div>
      </div>

      {/* Linha 2: Período de Pagamento, Ordenação e Busca */}
      <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        {/* Busca por texto */}
        <div className="lg:col-span-4">
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Buscar dupla ou categoria
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Ex: Daniel, Igor, Intermediário..."
              className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-8 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {busca && (
              <button
                type="button"
                onClick={() => onBuscaChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data De / Até */}
        <div className="flex items-center gap-2 lg:col-span-5">
          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
              <Calendar className="size-3" /> Data de
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
              <Calendar className="size-3" /> Até
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Ordenação */}
        <div className="lg:col-span-3">
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
            <ArrowUpDown className="size-3" /> Organizar por
          </label>
          <select
            value={ordem}
            onChange={(e) => onOrdemChange(e.target.value as OrdemOpcao)}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="data_desc">Data: Mais recentes</option>
            <option value="data_asc">Data: Mais antigas</option>
            <option value="valor_desc">Valor: Maior valor</option>
            <option value="valor_asc">Valor: Menor valor</option>
          </select>
        </div>
      </div>

      {/* Indicador de filtros ativos e limpar */}
      {temFiltroAtivo && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {totalFiltrado} {totalFiltrado === 1 ? "resultado encontrado" : "resultados encontrados"}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <X className="size-3" /> Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  );
}
