"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ReceiptText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
  Trash2,
  Calendar,
  Tag,
  X,
  Loader2,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Surface } from "@/components/shell/Surface";
import { EmptyState } from "@/components/shell/EmptyState";
import {
  CATEGORIAS_DESPESA_PADRAO,
  daysUntilDue,
  isExpenseOverdue,
  isExpenseDueSoon,
  getSaoPauloDateString,
  parseCurrencyBR,
  type ChampionshipExpense,
  type ChampionshipExpenseStatus,
} from "@/lib/championship-expenses";
import {
  criarDespesaAction,
  atualizarDespesaAction,
  alternarStatusDespesaAction,
  excluirDespesaAction,
} from "@/lib/championship-expenses-actions";

export type DespesasManagerProps = {
  champId: string;
  champSlugOrId?: string;
  initialExpenses: ChampionshipExpense[];
};

export function DespesasManager({
  champId,
  champSlugOrId: _champSlugOrId,
  initialExpenses,
}: DespesasManagerProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ChampionshipExpense[]>(initialExpenses);
  const [filterStatus, setFilterStatus] = useState<"todas" | "pendente" | "pago">("todas");
  const [filterCategory, setFilterCategory] = useState<string>("todas");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ChampionshipExpense | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState("Premiação");
  const [formCustomCategoria, setFormCustomCategoria] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formDataVencimento, setFormDataVencimento] = useState(getSaoPauloDateString());
  const [formStatus, setFormStatus] = useState<ChampionshipExpenseStatus>("pendente");
  const [formObservacao, setFormObservacao] = useState("");

  // Extracted unique categories for filter
  const allCategories = Array.from(
    new Set([...CATEGORIAS_DESPESA_PADRAO, ...expenses.map((e) => e.categoria)]),
  );

  const openNewModal = () => {
    setEditingExpense(null);
    setFormNome("");
    setFormCategoria("Premiação");
    setFormCustomCategoria("");
    setFormValor("");
    setFormDataVencimento(getSaoPauloDateString());
    setFormStatus("pendente");
    setFormObservacao("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: ChampionshipExpense) => {
    setEditingExpense(exp);
    setFormNome(exp.nome);
    if ((CATEGORIAS_DESPESA_PADRAO as readonly string[]).includes(exp.categoria)) {
      setFormCategoria(exp.categoria);
      setFormCustomCategoria("");
    } else {
      setFormCategoria("Outra");
      setFormCustomCategoria(exp.categoria);
    }
    setFormValor(exp.valor.toFixed(2).replace(".", ","));
    setFormDataVencimento(exp.dataVencimento);
    setFormStatus(exp.status);
    setFormObservacao(exp.observacao ?? "");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setErrorMsg(null);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const chosenCategoria = formCategoria === "Outra"
      ? formCustomCategoria.trim()
      : formCategoria.trim();

    if (!chosenCategoria) {
      setErrorMsg("Informe a categoria da despesa.");
      return;
    }

    const valorNum = parseCurrencyBR(formValor);
    if (!Number.isFinite(valorNum) || valorNum < 0.01) {
      setErrorMsg("Informe um valor válido (mínimo R$ 0,01).");
      return;
    }

    startTransition(async () => {
      if (editingExpense) {
        const res = await atualizarDespesaAction({
          champId,
          expenseId: editingExpense.id,
          nome: formNome,
          categoria: chosenCategoria,
          valor: valorNum,
          dataVencimento: formDataVencimento,
          status: formStatus,
          observacao: formObservacao,
        });
        if (!res.ok) {
          setErrorMsg(res.error ?? "Erro ao atualizar despesa.");
          return;
        }
        if (res.expense) {
          const updated = res.expense;
          setExpenses((prev) =>
            prev.map((item) => (item.id === editingExpense.id ? updated : item)),
          );
        }
      } else {
        const res = await criarDespesaAction({
          champId,
          nome: formNome,
          categoria: chosenCategoria,
          valor: valorNum,
          dataVencimento: formDataVencimento,
          status: formStatus,
          observacao: formObservacao,
        });
        if (!res.ok) {
          setErrorMsg(res.error ?? "Erro ao salvar despesa.");
          return;
        }
        if (res.expense) {
          const created = res.expense;
          setExpenses((prev) => [created, ...prev]);
        }
      }
      closeModal();
      router.refresh();
    });
  };

  const handleToggleStatus = (exp: ChampionshipExpense) => {
    const nextStatus: ChampionshipExpenseStatus = exp.status === "pago" ? "pendente" : "pago";
    setActionError(null);
    startTransition(async () => {
      const res = await alternarStatusDespesaAction({
        champId,
        expenseId: exp.id,
        nextStatus,
      });
      if (!res.ok) {
        setActionError(res.error ?? "Não foi possível atualizar o status da despesa.");
        return;
      }
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === exp.id
            ? {
                ...item,
                status: nextStatus,
                dataPagamento: nextStatus === "pago" ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
      router.refresh();
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    setActionError(null);
    setConfirmingDeleteId(null);
    startTransition(async () => {
      const res = await excluirDespesaAction({
        champId,
        expenseId,
      });
      if (!res.ok) {
        setActionError(res.error ?? "Não foi possível excluir a despesa.");
        return;
      }
      setExpenses((prev) => prev.filter((item) => item.id !== expenseId));
      router.refresh();
    });
  };

  // Filtragem da lista
  const filtered = expenses.filter((item) => {
    if (filterStatus !== "todas" && item.status !== filterStatus) return false;
    if (filterCategory !== "todas" && item.categoria !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNome = item.nome.toLowerCase().includes(q);
      const matchCat = item.categoria.toLowerCase().includes(q);
      const matchObs = item.observacao?.toLowerCase().includes(q);
      if (!matchNome && !matchCat && !matchObs) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Ações e Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Busca e Filtros */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Buscar despesa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Status */}
          <div className="inline-flex rounded-xl border border-border bg-surface-2 p-1 text-xs">
            <button
              onClick={() => setFilterStatus("todas")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filterStatus === "todas" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus("pendente")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filterStatus === "pendente" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              A vencer
            </button>
            <button
              onClick={() => setFilterStatus("pago")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filterStatus === "pago" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Pagas
            </button>
          </div>

          {/* Filtro Categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:outline-none"
          >
            <option value="todas">Todas as categorias</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Botão Nova Despesa */}
        <button
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
        >
          <Plus className="size-4" />
          Nova Despesa
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Fechar aviso"
            className="rounded p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-800"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Lista de Despesas */}
      {filtered.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={ReceiptText}
            title={
              expenses.length === 0
                ? "Nenhuma despesa lançada ainda"
                : "Nenhuma despesa encontrada com os filtros selecionados"
            }
            description={
              expenses.length === 0
                ? "Lance os custos do seu campeonato (premiação, arbitragem, quadra, estrutura) para calcular o lucro líquido real do torneio."
                : "Tente limpar os filtros ou o termo de busca para visualizar as despesas."
            }
          />
          {expenses.length === 0 && (
            <div className="flex justify-center">
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition-colors"
              >
                <Plus className="size-4" />
                Lançar primeira despesa
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isPago = item.status === "pago";
            const overdue = !isPago && isExpenseOverdue(item.dataVencimento);
            const dueSoon = !isPago && isExpenseDueSoon(item.dataVencimento);
            const daysDiff = daysUntilDue(item.dataVencimento);

            return (
              <Surface
                key={item.id}
                padding="md"
                className={`relative flex flex-col justify-between transition-all bg-surface ${
                  isPago
                    ? "ring-emerald-200"
                    : overdue
                      ? "ring-rose-300"
                      : dueSoon
                        ? "ring-amber-300"
                        : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                      <Tag className="size-3" />
                      {item.categoria}
                    </span>

                    {/* Badge de Vencimento / Pagamento */}
                    {isPago ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="size-3" />
                        Pago
                      </span>
                    ) : overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        <AlertTriangle className="size-3" />
                        Atrasada ({Math.abs(daysDiff)}d)
                      </span>
                    ) : daysDiff === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="size-3" />
                        Vence hoje
                      </span>
                    ) : dueSoon ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="size-3" />
                        Em {daysDiff}d
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        <Calendar className="size-3" />
                        Vence {formatDateBR(item.dataVencimento)}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-ink leading-tight">
                    {item.nome}
                  </h3>

                  <p className="mt-1 text-xl font-black text-ink">
                    {formatBRL(item.valor)}
                  </p>

                  {item.observacao && (
                    <p className="mt-1.5 text-xs text-ink-muted line-clamp-2 italic">
                      “{item.observacao}”
                    </p>
                  )}
                </div>

                {/* Ações Rápidas no Card */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      isPago
                        ? "bg-surface-2 text-ink-muted hover:bg-border/60"
                        : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                    }`}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {isPago ? "Reabrir conta" : "Marcar como pago"}
                  </button>

                  <div className="flex items-center gap-1">
                    {confirmingDeleteId === item.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item.id)}
                          disabled={isPending}
                          className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isPending}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={isPending}
                          title="Editar despesa"
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(item.id)}
                          disabled={isPending}
                          title="Excluir despesa"
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      {/* Modal / Drawer de Criar & Editar Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-ink">
                {editingExpense ? "Editar Despesa" : "Nova Despesa do Campeonato"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {errorMsg}
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Nome da despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Troféus e Medalhas, Arbitragem, Tendas..."
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Categoria *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIAS_DESPESA_PADRAO.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setFormCategoria(cat)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        formCategoria === cat
                          ? "bg-brand text-white font-bold"
                          : "bg-surface-2 text-ink-muted hover:bg-border/60"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormCategoria("Outra")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      formCategoria === "Outra"
                        ? "bg-brand text-white font-bold"
                        : "bg-surface-2 text-ink-muted hover:bg-border/60"
                    }`}
                  >
                    + Personalizada
                  </button>
                </div>

                {formCategoria === "Outra" && (
                  <input
                    type="text"
                    required
                    placeholder="Nome da categoria personalizada..."
                    value={formCustomCategoria}
                    onChange={(e) => setFormCustomCategoria(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                  />
                )}
              </div>

              {/* Valor e Vencimento em grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Valor (R$) *
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs text-ink-muted font-bold">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0,00"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2.5 text-sm font-bold text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Status Inicial
                </label>
                <div className="inline-flex rounded-xl border border-border bg-surface-2 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormStatus("pendente")}
                    className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                      formStatus === "pendente"
                        ? "bg-amber-500 text-white font-bold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Pendente (a pagar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus("pago")}
                    className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                      formStatus === "pago"
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Já foi pago
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Pix para fornecedor X, pagar após a cerimônia..."
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink hover:bg-border/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {editingExpense ? "Salvar alterações" : "Cadastrar despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
