"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle, Inbox,
  PlusCircle, ArrowDownCircle, ArrowUpCircle, FilterX, History, Wallet,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { apagarDespesa, apagarReceita } from "@/app/admin/gasto-mensal/actions";
import { DespesaForm } from "@/components/admin/gasto-mensal/DespesaForm";
import { ReceitaForm } from "@/components/admin/gasto-mensal/ReceitaForm";
import { ExcluirEscopoDialog } from "@/components/admin/gasto-mensal/ExcluirEscopoDialog";
import { ConfirmarExclusaoDialog } from "@/components/admin/gasto-mensal/ConfirmarExclusaoDialog";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  formatDateTimeBahia, personSelecaoLabel, periodoResumoLabel, diffEventSnapshots,
  groupHistoryEventsByEntity, filtrarHistorico, HISTORY_FILTROS_VAZIOS,
  groupMonthBounds, fazParteDeGrupo, siblingsOfGroup, contagensDoEscopo,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome, type MonthlyBudgetHistoryEvent,
  type MonthlyBudgetEventSnapshot, type HistoryFiltros, type HistoryTipoFiltro, type HistoryAcaoFiltro,
  type HistoryAction, type HistoryEntityKind, type PersonFilter, type EscopoEdicao,
} from "@/lib/monthly-budget";

const COR_CARLOS = "#2563eb"; // blue-600
const COR_JULIA  = "#f43f5e"; // rose-500

const TIPO_OPCOES: { v: HistoryTipoFiltro; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: "income", label: "Receitas" },
  { v: "expense", label: "Despesas" },
];

const ACAO_OPCOES: { v: HistoryAcaoFiltro; label: string }[] = [
  { v: "todos", label: "Todas" },
  { v: "created", label: "Cadastro" },
  { v: "updated", label: "Edição" },
  { v: "deleted", label: "Exclusão" },
  { v: "payment_changed", label: "Pagamento" },
  { v: "imported", label: "Registro existente" },
];

const PESSOA_OPCOES: { v: PersonFilter; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: "carlos", label: "Carlos" },
  { v: "julia", label: "Julia" },
];

const ACTION_BADGE: Record<HistoryAction, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  created:          { label: "Cadastro",          cls: "bg-blue-50 text-blue-700",     icon: PlusCircle },
  updated:          { label: "Edição",             cls: "bg-violet-50 text-violet-700", icon: Pencil },
  deleted:          { label: "Exclusão",           cls: "bg-gray-100 text-red-600",     icon: Trash2 },
  payment_changed:  { label: "Pagamento",          cls: "bg-amber-50 text-amber-700",   icon: Wallet },
  imported:         { label: "Registro existente", cls: "bg-gray-100 text-gray-600",    icon: History },
};

function segmentoCls(ativo: boolean) {
  return `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    ativo ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
  }`;
}

function ActionBadge({ action }: { action: HistoryAction }) {
  const { label, cls, icon: Icon } = ACTION_BADGE[action];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon className="size-3" /> {label}
    </span>
  );
}

function EntityKindBadge({ kind }: { kind: HistoryEntityKind }) {
  return kind === "income" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <ArrowUpCircle className="size-3" /> Receita
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
      <ArrowDownCircle className="size-3" /> Despesa
    </span>
  );
}

function PessoaDots({ person }: { person: "carlos" | "julia" | "carlos_e_julia" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {(person === "carlos" || person === "carlos_e_julia") && (
        <span className="size-2 rounded-full" style={{ backgroundColor: COR_CARLOS }} />
      )}
      {(person === "julia" || person === "carlos_e_julia") && (
        <span className="size-2 rounded-full" style={{ backgroundColor: COR_JULIA }} />
      )}
    </span>
  );
}

/** Snapshot "efetivo" de um evento pra exibição resumida: depois quando
 *  existe (created/updated/imported/payment_changed), senão antes (deleted). */
function snapshotEfetivo(evento: MonthlyBudgetHistoryEvent): MonthlyBudgetEventSnapshot | null {
  return evento.afterSnapshot ?? evento.beforeSnapshot;
}

export function ExtratoClient({
  events,
  expenses,
  incomes,
}: {
  events: MonthlyBudgetHistoryEvent[];
  expenses: MonthlyBudgetExpense[];
  incomes: MonthlyBudgetIncome[];
}) {
  const router = useRouter();

  const [filtros, setFiltros] = useState<HistoryFiltros>(HISTORY_FILTROS_VAZIOS);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [despesaAlvo, setDespesaAlvo] = useState<MonthlyBudgetExpense | null>(null);
  const [receitaAlvo, setReceitaAlvo] = useState<MonthlyBudgetIncome | null>(null);
  const [excluirDespesaAlvo, setExcluirDespesaAlvo] = useState<MonthlyBudgetExpense | null>(null);
  const [excluirReceitaAlvo, setExcluirReceitaAlvo] = useState<MonthlyBudgetIncome | null>(null);
  const [apagandoId, setApagandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 2500);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  useEffect(() => {
    if (!mensagemErro) return;
    const t = setTimeout(() => setMensagemErro(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemErro]);

  useEffect(() => {
    if (!detalheId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetalheId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detalheId]);

  const eventosFiltrados = useMemo(() => filtrarHistorico(events, filtros), [events, filtros]);

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(events.flatMap((e) => e.affectedMonths))).sort().reverse(),
    [events],
  );

  // Cada entity_group_id vira uma "cadeia" — usado pra saber se o evento
  // aberto é o mais recente de um lançamento que ainda existe (só aí faz
  // sentido oferecer "Editar/Excluir lançamento atual").
  const gruposPorId = useMemo(() => {
    const grupos = groupHistoryEventsByEntity(events);
    return new Map(grupos.map((g) => [g.entityGroupId, g]));
  }, [events]);

  const eventosPorId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const filtrosAtivos =
    filtros.tipo !== "todos" || filtros.acao !== "todos" || filtros.pessoa !== "todos" ||
    filtros.busca.trim() !== "" || filtros.monthKey !== "" || filtros.dataInicio !== "" || filtros.dataFim !== "";

  function atualizarFiltro<K extends keyof HistoryFiltros>(chave: K, valor: HistoryFiltros[K]) {
    setFiltros((f) => ({ ...f, [chave]: valor }));
  }

  function limparFiltros() {
    setFiltros(HISTORY_FILTROS_VAZIOS);
  }

  /** Acha a linha AO VIVO (monthly_budget_expenses/incomes) que representa o
   *  lançamento atual de um grupo — pela âncora do evento quando ainda
   *  existe, senão a primeira ocorrência viva do grupo. */
  function encontrarLinhaAtual(evento: MonthlyBudgetHistoryEvent): MonthlyBudgetExpense | MonthlyBudgetIncome | null {
    if (!evento.entityGroupId) return null;
    const lista = evento.entityKind === "expense" ? expenses : incomes;
    const doGrupo = lista.filter((item) => item.repeatGroupId === evento.entityGroupId);
    if (doGrupo.length === 0) return null;
    return doGrupo.find((item) => item.monthKey === evento.anchorMonthKey)
      ?? [...doGrupo].sort((a, b) => a.monthKey.localeCompare(b.monthKey))[0];
  }

  function handleEditarAtual(evento: MonthlyBudgetHistoryEvent) {
    const linha = encontrarLinhaAtual(evento);
    if (!linha) return;
    if (evento.entityKind === "expense") setDespesaAlvo(linha as MonthlyBudgetExpense);
    else setReceitaAlvo(linha as MonthlyBudgetIncome);
  }

  function handleExcluirAtual(evento: MonthlyBudgetHistoryEvent) {
    const linha = encontrarLinhaAtual(evento);
    if (!linha) return;
    if (evento.entityKind === "expense") setExcluirDespesaAlvo(linha as MonthlyBudgetExpense);
    else setExcluirReceitaAlvo(linha as MonthlyBudgetIncome);
  }

  function executarExclusaoDespesa(despesa: MonthlyBudgetExpense, escopo: EscopoEdicao) {
    setExcluirDespesaAlvo(null);
    setApagandoId(despesa.id);
    startTransition(async () => {
      const res = await apagarDespesa({ id: despesa.id, escopo });
      setApagandoId(null);
      if (res.ok) {
        setMensagemSucesso("Despesa excluída. Um evento de exclusão foi registrado no Extrato.");
        setDetalheId(null);
        router.refresh();
      } else {
        setMensagemErro(res.error ?? "Erro ao excluir a despesa.");
      }
    });
  }

  function executarExclusaoReceita(income: MonthlyBudgetIncome, escopo: EscopoEdicao) {
    setExcluirReceitaAlvo(null);
    setApagandoId(income.id);
    startTransition(async () => {
      const res = await apagarReceita({ id: income.id, escopo });
      setApagandoId(null);
      if (res.ok) {
        setMensagemSucesso("Receita excluída. Um evento de exclusão foi registrado no Extrato.");
        setDetalheId(null);
        router.refresh();
      } else {
        setMensagemErro(res.error ?? "Erro ao excluir a receita.");
      }
    });
  }

  const eventoDetalhe = detalheId ? eventosPorId.get(detalheId) ?? null : null;

  return (
    <div className="space-y-4">
      {/* ── Feedback ── */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 className="size-4 shrink-0" /> {mensagemSucesso}
        </div>
      )}
      {mensagemErro && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-100">
          <AlertCircle className="size-4 shrink-0" /> {mensagemErro}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-300" />
            <input
              value={filtros.busca}
              onChange={(e) => atualizarFiltro("busca", e.target.value)}
              placeholder="Buscar por nome"
              className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={limparFiltros}
            disabled={!filtrosAtivos}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          >
            <FilterX className="size-3.5" /> Limpar filtros
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex flex-wrap gap-0.5 rounded-xl bg-gray-100 p-1">
            {TIPO_OPCOES.map((o) => (
              <button key={o.v} type="button" onClick={() => atualizarFiltro("tipo", o.v)} className={segmentoCls(filtros.tipo === o.v)}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="inline-flex flex-wrap gap-0.5 rounded-xl bg-gray-100 p-1">
            {PESSOA_OPCOES.map((o) => (
              <button key={o.v} type="button" onClick={() => atualizarFiltro("pessoa", o.v)} className={segmentoCls(filtros.pessoa === o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400">Ação</label>
          <div className="mt-1 inline-flex flex-wrap gap-0.5 rounded-xl bg-gray-100 p-1">
            {ACAO_OPCOES.map((o) => (
              <button key={o.v} type="button" onClick={() => atualizarFiltro("acao", o.v)} className={segmentoCls(filtros.acao === o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-400">Mês afetado</label>
            <select
              value={filtros.monthKey}
              onChange={(e) => atualizarFiltro("monthKey", e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os meses</option>
              {mesesDisponiveis.map((mk) => (
                <option key={mk} value={mk}>{periodoResumoLabel({ periodStart: mk, periodEnd: mk, monthsCount: 1 })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400">Evento de</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400">Evento até</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          {eventosFiltrados.length} {eventosFiltrados.length === 1 ? "evento encontrado" : "eventos encontrados"}
          {filtrosAtivos && eventosFiltrados.length !== events.length && ` de ${events.length} no total`}
        </p>
      </div>

      {/* ── Timeline ── */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
          <Inbox className="size-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum evento registrado ainda.</p>
          <p className="text-xs text-gray-400">Cadastros, edições e exclusões do Gasto mensal aparecem aqui assim que acontecerem.</p>
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
          <Search className="size-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum resultado para os filtros atuais.</p>
          <button type="button" onClick={limparFiltros} className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700">
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {eventosFiltrados.map((evento) => {
            const snap = snapshotEfetivo(evento);
            const grupo = evento.entityGroupId ? gruposPorId.get(evento.entityGroupId) : null;
            const isEdicao = evento.action === "updated" && evento.previousEventId != null;
            return (
              <li key={evento.id}>
                <button
                  type="button"
                  onClick={() => setDetalheId(evento.id)}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-white p-3.5 text-left ring-1 ring-black/5 transition-colors hover:ring-blue-200"
                >
                  <ActionBadge action={evento.action} />
                  <EntityKindBadge kind={evento.entityKind} />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {snap?.name ?? "(sem nome)"}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                      {snap && <span>{periodoResumoLabel(snap)}</span>}
                      {isEdicao && <span className="text-violet-500">· edição de um lançamento anterior</span>}
                    </p>
                  </div>
                  {snap && (
                    <div className="flex items-center gap-1.5">
                      <PessoaDots person={snap.person} />
                      <span className="text-xs text-gray-500">{personSelecaoLabel(snap.person)}</span>
                    </div>
                  )}
                  {snap && (
                    <span className={`shrink-0 text-sm font-semibold ${evento.action === "deleted" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {formatBRL(snap.amountTotal)}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-gray-400">{formatDateTimeBahia(evento.occurredAt)}</span>
                  {grupo && grupo.latestEvent.id === evento.id && !grupo.isDeleted && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Atual</span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-gray-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Painel de detalhes ── */}
      {eventoDetalhe && (
        <DetalheEvento
          evento={eventoDetalhe}
          grupo={eventoDetalhe.entityGroupId ? gruposPorId.get(eventoDetalhe.entityGroupId) ?? null : null}
          eventoAnterior={eventoDetalhe.previousEventId ? eventosPorId.get(eventoDetalhe.previousEventId) ?? null : null}
          onAbrirEvento={(id) => setDetalheId(id)}
          onFechar={() => setDetalheId(null)}
          onEditarAtual={() => handleEditarAtual(eventoDetalhe)}
          onExcluirAtual={() => handleExcluirAtual(eventoDetalhe)}
          apagando={apagandoId != null}
        />
      )}

      {/* ── Edição do lançamento atual — reaproveita os mesmos formulários da página principal ── */}
      {despesaAlvo && (
        <DespesaForm
          monthKey={despesaAlvo.monthKey}
          expense={despesaAlvo}
          groupStartMonthKey={groupMonthBounds(expenses, despesaAlvo).start}
          groupEndMonthKey={groupMonthBounds(expenses, despesaAlvo).end}
          onClose={() => setDespesaAlvo(null)}
          onSaved={() => { setMensagemSucesso("Despesa atualizada. Um novo evento foi registrado no Extrato."); setDetalheId(null); }}
        />
      )}
      {receitaAlvo && (
        <ReceitaForm
          monthKey={receitaAlvo.monthKey}
          income={receitaAlvo}
          groupStartMonthKey={groupMonthBounds(incomes, receitaAlvo).start}
          groupEndMonthKey={groupMonthBounds(incomes, receitaAlvo).end}
          onClose={() => setReceitaAlvo(null)}
          onSaved={() => { setMensagemSucesso("Receita atualizada. Um novo evento foi registrado no Extrato."); setDetalheId(null); }}
        />
      )}

      {/* ── Exclusão do lançamento atual ── */}
      {excluirDespesaAlvo && (
        fazParteDeGrupo(expenses, excluirDespesaAlvo) ? (
          <ExcluirEscopoDialog
            nome={excluirDespesaAlvo.name}
            contagens={contagensDoEscopo(
              siblingsOfGroup(expenses, excluirDespesaAlvo).map((g) => ({ id: g.id, monthKey: g.monthKey })),
              excluirDespesaAlvo.monthKey,
            )}
            onConfirm={(escopo) => executarExclusaoDespesa(excluirDespesaAlvo, escopo)}
            onCancel={() => setExcluirDespesaAlvo(null)}
          />
        ) : (
          <ConfirmarExclusaoDialog
            titulo="Excluir despesa?"
            mensagem={`Excluir a despesa "${excluirDespesaAlvo.name}"? Essa ação não pode ser desfeita — o histórico continua registrado no Extrato.`}
            onConfirm={() => executarExclusaoDespesa(excluirDespesaAlvo, "esta")}
            onCancel={() => setExcluirDespesaAlvo(null)}
          />
        )
      )}
      {excluirReceitaAlvo && (
        fazParteDeGrupo(incomes, excluirReceitaAlvo) ? (
          <ExcluirEscopoDialog
            nome={excluirReceitaAlvo.name}
            contagens={contagensDoEscopo(
              siblingsOfGroup(incomes, excluirReceitaAlvo).map((g) => ({ id: g.id, monthKey: g.monthKey })),
              excluirReceitaAlvo.monthKey,
            )}
            onConfirm={(escopo) => executarExclusaoReceita(excluirReceitaAlvo, escopo)}
            onCancel={() => setExcluirReceitaAlvo(null)}
          />
        ) : (
          <ConfirmarExclusaoDialog
            titulo="Excluir receita?"
            mensagem={`Excluir a receita "${excluirReceitaAlvo.name}"? Essa ação não pode ser desfeita — o histórico continua registrado no Extrato.`}
            onConfirm={() => executarExclusaoReceita(excluirReceitaAlvo, "esta")}
            onCancel={() => setExcluirReceitaAlvo(null)}
          />
        )
      )}
    </div>
  );
}

// ── Painel de detalhes de um evento ──────────────────────────────────────────

function OcorrenciasExpandiveis({ snapshot, kind }: { snapshot: MonthlyBudgetEventSnapshot; kind: HistoryEntityKind }) {
  if (snapshot.occurrences.length <= 1) return null;
  return (
    <details className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
      <summary className="cursor-pointer text-xs font-semibold text-gray-600">
        Ver os {snapshot.occurrences.length} meses gerados
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-gray-500">
        {snapshot.occurrences.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1 first:border-0 first:pt-0">
            <span>{periodoResumoLabel({ periodStart: o.monthKey, periodEnd: o.monthKey, monthsCount: 1 })}</span>
            <span className="flex items-center gap-2">
              {formatBRL(o.amountCarlos + o.amountJulia)}
              {kind === "expense" && o.dueDate && <span>· vence {formatDateBR(o.dueDate)}</span>}
              {kind === "expense" && (
                <span className={o.isPaid ? "text-emerald-600" : "text-orange-600"}>{o.isPaid ? "Pago" : "Pendente"}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CampoDiff({ label, valor, mudou }: { label: string; valor: string; mudou: boolean }) {
  return (
    <p className={mudou ? "rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-800" : "text-gray-600"}>
      <span className="text-gray-400">{label}: </span>
      <span className={mudou ? "font-semibold" : ""}>{valor}</span>
    </p>
  );
}

function SnapshotResumo({
  snapshot,
  kind,
  diff,
}: {
  snapshot: MonthlyBudgetEventSnapshot;
  kind: HistoryEntityKind;
  diff?: { name: boolean; amountCarlos: boolean; amountJulia: boolean; dueDay: boolean; period: boolean };
}) {
  const compartilhado = snapshot.person === "carlos_e_julia";
  return (
    <div className="space-y-1.5 rounded-xl bg-gray-50 p-3 text-sm ring-1 ring-black/5">
      <CampoDiff label="Nome" valor={snapshot.name} mudou={!!diff?.name} />
      <p className="flex items-center gap-1.5 text-gray-600">
        <PessoaDots person={snapshot.person} /> {personSelecaoLabel(snapshot.person)}
      </p>
      <CampoDiff
        label="Valor"
        valor={compartilhado ? `${formatBRL(snapshot.amountCarlos)} + ${formatBRL(snapshot.amountJulia)} = ${formatBRL(snapshot.amountTotal)}` : formatBRL(snapshot.amountTotal)}
        mudou={!!diff?.amountCarlos || !!diff?.amountJulia}
      />
      <CampoDiff label="Período" valor={periodoResumoLabel(snapshot)} mudou={!!diff?.period} />
      {kind === "expense" && (
        <CampoDiff label="Vencimento" valor={snapshot.dueDay ? `dia ${snapshot.dueDay}` : "sem vencimento definido"} mudou={!!diff?.dueDay} />
      )}
    </div>
  );
}

function DetalheEvento({
  evento,
  grupo,
  eventoAnterior,
  onAbrirEvento,
  onFechar,
  onEditarAtual,
  onExcluirAtual,
  apagando,
}: {
  evento: MonthlyBudgetHistoryEvent;
  grupo: ReturnType<typeof groupHistoryEventsByEntity>[number] | null;
  eventoAnterior: MonthlyBudgetHistoryEvent | null;
  onAbrirEvento: (id: string) => void;
  onFechar: () => void;
  onEditarAtual: () => void;
  onExcluirAtual: () => void;
  apagando: boolean;
}) {
  const diff = diffEventSnapshots(evento.beforeSnapshot, evento.afterSnapshot);
  const ehAtual = !!grupo && grupo.latestEvent.id === evento.id && !grupo.isDeleted && evento.action !== "deleted";
  const ehEdicao = evento.action === "updated";
  const ehPagamento = evento.action === "payment_changed";
  const ehExclusao = evento.action === "deleted";
  const ehCriacaoOuImportado = evento.action === "created" || evento.action === "imported";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Detalhes do evento">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={evento.action} />
            <EntityKindBadge kind={evento.entityKind} />
            {ehAtual && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">Lançamento atual</span>}
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-gray-400">{formatDateTimeBahia(evento.occurredAt)} · fuso de Bahia</p>

        {ehExclusao && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Este lançamento foi excluído e não existe mais na página principal.
          </p>
        )}

        {/* Cadastro / Registro existente: só o "depois" */}
        {ehCriacaoOuImportado && evento.afterSnapshot && (
          <div className="space-y-3">
            <SnapshotResumo snapshot={evento.afterSnapshot} kind={evento.entityKind} />
            <p className="text-xs text-gray-400">{evento.afterSnapshot.monthsCount} {evento.afterSnapshot.monthsCount === 1 ? "mês gerado" : "meses gerados"}</p>
            <OcorrenciasExpandiveis snapshot={evento.afterSnapshot} kind={evento.entityKind} />
          </div>
        )}

        {/* Pagamento: só o status muda */}
        {ehPagamento && evento.beforeSnapshot && evento.afterSnapshot && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">{evento.afterSnapshot.name}</p>
            <p className="flex items-center gap-2 text-sm">
              <span className={evento.beforeSnapshot.occurrences[0]?.isPaid ? "text-emerald-600" : "text-orange-600"}>
                {evento.beforeSnapshot.occurrences[0]?.isPaid ? "Pago" : "Pendente"}
              </span>
              <ChevronRight className="size-3.5 text-gray-300" />
              <span className={evento.afterSnapshot.occurrences[0]?.isPaid ? "font-semibold text-emerald-600" : "font-semibold text-orange-600"}>
                {evento.afterSnapshot.occurrences[0]?.isPaid ? "Pago" : "Pendente"}
              </span>
            </p>
            <p className="text-xs text-gray-400">{periodoResumoLabel(evento.afterSnapshot)} · {formatBRL(evento.afterSnapshot.amountTotal)}</p>
          </div>
        )}

        {/* Edição: antes/depois lado a lado */}
        {ehEdicao && (
          <div className="space-y-3">
            {evento.editScope && (
              <p className="text-xs text-gray-500">
                Escopo usado: <span className="font-medium text-gray-700">
                  {evento.editScope === "esta" ? "somente este mês" : evento.editScope === "esta_e_proximas" ? "este mês e os próximos" : "todos os meses"}
                </span>
                {" · "}{evento.affectedMonths.length} {evento.affectedMonths.length === 1 ? "mês afetado" : "meses afetados"}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Antes</p>
                {evento.beforeSnapshot
                  ? <SnapshotResumo snapshot={evento.beforeSnapshot} kind={evento.entityKind} diff={diff} />
                  : <p className="text-xs text-gray-400">Sem estado anterior (mês novo criado por esta edição).</p>}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Depois</p>
                {evento.afterSnapshot
                  ? <SnapshotResumo snapshot={evento.afterSnapshot} kind={evento.entityKind} diff={diff} />
                  : <p className="text-xs text-gray-400">Removido por esta edição.</p>}
              </div>
            </div>
            {eventoAnterior && (
              <button
                type="button"
                onClick={() => onAbrirEvento(eventoAnterior.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="size-3.5" /> Ver evento anterior desta cadeia ({ACTION_BADGE[eventoAnterior.action].label.toLowerCase()})
              </button>
            )}
          </div>
        )}

        {/* Exclusão: último estado removido */}
        {ehExclusao && evento.beforeSnapshot && (
          <div className="space-y-3">
            {evento.editScope && (
              <p className="text-xs text-gray-500">
                Escopo usado: <span className="font-medium text-gray-700">
                  {evento.editScope === "esta" ? "somente este mês" : evento.editScope === "esta_e_proximas" ? "este mês e os próximos" : "todos os meses"}
                </span>
                {" · "}{evento.affectedMonths.length} {evento.affectedMonths.length === 1 ? "mês excluído" : "meses excluídos"}
              </p>
            )}
            <SnapshotResumo snapshot={evento.beforeSnapshot} kind={evento.entityKind} />
            <OcorrenciasExpandiveis snapshot={evento.beforeSnapshot} kind={evento.entityKind} />
            {eventoAnterior && (
              <button
                type="button"
                onClick={() => onAbrirEvento(eventoAnterior.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="size-3.5" /> Ver evento anterior desta cadeia
              </button>
            )}
          </div>
        )}

        {!ehAtual && grupo && !grupo.isDeleted && (
          <button
            type="button"
            onClick={() => onAbrirEvento(grupo.latestEvent.id)}
            className="mt-4 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="size-3.5" /> Ver versão atual deste lançamento
          </button>
        )}

        {ehAtual && (
          <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onEditarAtual}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Pencil className="size-4" /> Editar lançamento atual
            </button>
            <button
              type="button"
              onClick={onExcluirAtual}
              disabled={apagando}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {apagando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Excluir lançamento atual
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
