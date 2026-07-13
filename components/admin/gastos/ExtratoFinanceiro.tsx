"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil, Trash2, Loader2, ReceiptText, Search, Users } from "lucide-react";
import { apagarLancamento } from "@/app/admin/gastos/actions";
import { EditarLancamentoForm } from "@/components/admin/gastos/EditarLancamentoForm";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  hojeISO, extratoPorMes, monthLabelLong, BANK_LABEL, PAYMENT_METHOD_LABEL, TYPE_LABEL,
  type PersonalFinanceEntry, type RecurringOverride, type PersonalFinanceCategory,
  type PersonFilter, type EntryType, type ExtratoFiltros, type ExtratoItem,
} from "@/lib/personal-finance";

const COR_CARLOS = "#2563eb";
const COR_JULIA  = "#f43f5e";

const PESSOA_OPCOES = [
  { v: "todos" as const,  label: "Todos",  cls: "bg-gray-900 text-white" },
  { v: "carlos" as const, label: "Carlos", cls: "bg-blue-600 text-white" },
  { v: "julia" as const,  label: "Julia",  cls: "bg-rose-500 text-white" },
];

export function ExtratoFinanceiro({
  entries,
  overrides,
  categories,
  onClose,
}: {
  entries: PersonalFinanceEntry[];
  overrides: RecurringOverride[];
  categories: PersonalFinanceCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const hoje = hojeISO();

  const [pessoa, setPessoa] = useState<PersonFilter>("todos");
  const [tipo, setTipo] = useState<"todos" | EntryType>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ExtratoItem | null>(null);
  const [apagandoChave, setApagandoChave] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtros: ExtratoFiltros = useMemo(
    () => ({ pessoa, tipo, dataInicio: dataInicio || null, dataFim: dataFim || null, busca }),
    [pessoa, tipo, dataInicio, dataFim, busca],
  );

  const meses = useMemo(() => extratoPorMes(entries, overrides, filtros, hoje), [entries, overrides, filtros, hoje]);

  function handleApagar(item: ExtratoItem) {
    const { entry, monthKey } = item;
    const chave = `${entry.id}|${monthKey}`;
    const compartilhado = entry.sharedEntryGroupId != null;

    let escopoPessoa: "esta" | "ambos" | undefined;
    if (compartilhado) {
      const apagarAmbos = confirm(
        `"${entry.name}" foi criado pra Carlos e Julia.\n\nOK = apagar dos DOIS.\nCancelar = apagar só de ${entry.person === "carlos" ? "Carlos" : "Julia"}.`,
      );
      escopoPessoa = apagarAmbos ? "ambos" : "esta";
    }

    if (entry.isRecurring) {
      const apagarTudo = confirm(
        `"${entry.name}" é um lançamento fixo.\n\nOK = apagar em TODOS os meses.\nCancelar = apagar só em ${monthLabelLong(monthKey)}.`,
      );
      const confirmado = apagarTudo
        ? confirm("Apagar esse fixo em TODOS os meses? Essa ação não pode ser desfeita.")
        : confirm(`Apagar esse fixo somente em ${monthLabelLong(monthKey)}?`);
      if (!confirmado) return;

      setApagandoChave(chave);
      startTransition(async () => {
        await apagarLancamento({ entryId: entry.id, monthKey, escopoFixo: apagarTudo ? "todos_os_meses" : "este_mes", escopoPessoa });
        setApagandoChave(null);
        router.refresh();
      });
      return;
    }

    if (!confirm(`Remover "${entry.name}"? Essa ação não pode ser desfeita.`)) return;
    setApagandoChave(chave);
    startTransition(async () => {
      await apagarLancamento({ entryId: entry.id, escopoPessoa });
      setApagandoChave(null);
      router.refresh();
    });
  }

  function siblingDe(entry: PersonalFinanceEntry): PersonalFinanceEntry | null {
    if (!entry.sharedEntryGroupId) return null;
    return entries.find((e) => e.sharedEntryGroupId === entry.sharedEntryGroupId && e.person !== entry.person) ?? null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Extrato</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Filtros */}
      <div className="shrink-0 space-y-3 border-b border-gray-100 px-5 py-4">
        <div className="inline-flex gap-1 rounded-2xl bg-gray-100 p-1">
          {PESSOA_OPCOES.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPessoa(o.v)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                pessoa === o.v ? o.cls : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-400">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-medium text-gray-400">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              {(Object.keys(TYPE_LABEL) as EntryType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-medium text-gray-400">Buscar</label>
            <div className="relative mt-0.5">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-gray-300" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome ou categoria"
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-7 pr-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista agrupada por mês */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {meses.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Nenhum lançamento encontrado com esses filtros.</p>
        ) : (
          <div className="space-y-6">
            {meses.map((mes) => (
              <section key={mes.monthKey}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-sm font-bold text-gray-900">{mes.label}</h3>
                  <p className="flex flex-wrap gap-x-3 text-xs">
                    <span className="text-emerald-600">Renda {formatBRL(mes.totalRenda)}</span>
                    <span className="text-orange-600">Gasto {formatBRL(mes.totalGasto)}</span>
                    <span className="text-violet-600">Invest. {formatBRL(mes.totalInvestido)}</span>
                    <span className={`font-semibold ${mes.saldo < 0 ? "text-red-600" : "text-gray-700"}`}>
                      Saldo {formatBRL(mes.saldo)}
                    </span>
                  </p>
                </div>

                <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl ring-1 ring-black/5">
                  {mes.itens.map((item) => {
                    const chave = `${item.entry.id}|${item.monthKey}`;
                    const e = item.entry;
                    return (
                      <li key={chave} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: e.person === "carlos" ? COR_CARLOS : COR_JULIA }}
                        />
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {e.name}
                            {e.isInstallment && (
                              <span className="ml-1.5 text-xs font-normal text-gray-400">
                                {e.installmentNumber}/{e.installmentTotal}
                              </span>
                            )}
                            {e.isRecurring && (
                              <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                Fixo{item.hasOverride ? " · editado" : ""}
                              </span>
                            )}
                            {e.sharedEntryGroupId != null && (
                              <span
                                className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"
                                title="Criado pra Carlos e Julia"
                              >
                                <Users className="size-2.5" /> Compartilhado
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {e.category} · {formatDateBR(e.entryDate)} · {BANK_LABEL[e.bank]} · {PAYMENT_METHOD_LABEL[e.paymentMethod]}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            e.type === "gasto" ? "text-gray-900" : e.type === "renda" ? "text-emerald-600" : "text-violet-600"
                          }`}
                        >
                          {formatBRL(e.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditando(item)}
                          className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-600"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApagar(item)}
                          disabled={apagandoChave === chave}
                          className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                          title="Apagar"
                        >
                          {apagandoChave === chave ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {editando && (
        <EditarLancamentoForm
          entry={editando.entry}
          sibling={siblingDe(editando.entry)}
          monthKey={editando.monthKey}
          categories={categories}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}
