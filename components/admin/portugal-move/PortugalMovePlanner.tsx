"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Euro,
  ListChecks,
  MapPinned,
  Pencil,
  Plane,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  calculateUnpaidExpenseTotals,
  normalizePlannerExpenses,
  normalizePlannerTasks,
  unlinkExpensesForTask,
  upsertTaskAndLinkedExpense,
  type MoveCurrency,
  type MoveExpense,
  type MoveTask,
  type PlannerData,
} from "@/lib/portugal-move-planner";

type PlannerSnapshot = PlannerData & { storageError: boolean };

type EditorState =
  | { kind: "task"; value?: MoveTask }
  | { kind: "expense"; value?: MoveExpense }
  | null;

const STORAGE_KEY = "rankftv:personal-portugal-move:v1";
const DEFAULT_RATE = 6.25;
const EMPTY_DATA: PlannerData = { tasks: [], expenses: [], exchangeRate: DEFAULT_RATE };
const SERVER_SNAPSHOT: PlannerSnapshot = { ...EMPTY_DATA, storageError: false };
let clientSnapshot: PlannerSnapshot = SERVER_SNAPSHOT;
let clientSnapshotInitialized = false;
const snapshotListeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPlannerData(): PlannerData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    const tasks = normalizePlannerTasks(value.tasks);
    const expenses = normalizePlannerExpenses(value.expenses);
    const exchangeRate = typeof value.exchangeRate === "number" && Number.isFinite(value.exchangeRate) && value.exchangeRate > 0
      ? value.exchangeRate
      : DEFAULT_RATE;
    return { tasks, expenses, exchangeRate };
  } catch {
    return null;
  }
}

function getClientSnapshot(): PlannerSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (!clientSnapshotInitialized) {
    const stored = readPlannerData();
    clientSnapshot = { ...(stored ?? EMPTY_DATA), storageError: stored === null };
    clientSnapshotInitialized = true;
  }
  return clientSnapshot;
}

function subscribeToPlanner(listener: () => void): () => void {
  snapshotListeners.add(listener);
  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const stored = readPlannerData();
    clientSnapshot = { ...(stored ?? EMPTY_DATA), storageError: stored === null };
    clientSnapshotInitialized = true;
    for (const notify of snapshotListeners) notify();
  }
  window.addEventListener("storage", handleStorage);
  return () => {
    snapshotListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function updatePlannerData(updater: (current: PlannerData) => PlannerData) {
  const current = getClientSnapshot();
  const next = updater({ tasks: current.tasks, expenses: current.expenses, exchangeRate: current.exchangeRate });
  let storageError = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    storageError = true;
  }
  clientSnapshot = { ...next, storageError };
  clientSnapshotInitialized = true;
  for (const notify of snapshotListeners) notify();
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dueInDays(date: string): number | null {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = localDateKey().split("-").map(Number);
  if (!year || !month || !day) return null;
  const due = Date.UTC(year, month - 1, day);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round((due - today) / 86_400_000);
}

function formatDate(date: string): string {
  if (!date) return "Sem vencimento";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function formatMoney(value: number, currency: "BRL" | "EUR"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 })
    .format(Number.isFinite(value) ? value : 0);
}

function sortTasks(tasks: MoveTask[]): MoveTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function parseBrazilianNumber(value: string): number {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return Number.NaN;
  const parsed = normalized.includes(",")
    ? Number(normalized.replace(/\./g, "").replace(",", "."))
    : Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function dueLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return `Vencida há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

function dueColor(days: number | null): string {
  if (days !== null && days <= 5) return "border-red-200 bg-red-50 text-red-700";
  if (days !== null && days <= 10) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function PortugalMovePlanner() {
  const snapshot = useSyncExternalStore(subscribeToPlanner, getClientSnapshot, () => SERVER_SNAPSHOT);
  const { storageError, ...data } = snapshot;
  const [exchangeDraft, setExchangeDraft] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"tasks" | "expenses">("tasks");
  const [editor, setEditor] = useState<EditorState>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const exchangeInput = exchangeDraft ?? String(data.exchangeRate);
  const validRate = parseBrazilianNumber(exchangeInput);
  const rate = Number.isFinite(validRate) && validRate > 0 ? validRate : null;
  const sortedTasks = useMemo(() => sortTasks(data.tasks), [data.tasks]);
  const pendingTasks = data.tasks.filter((task) => !task.completed).length;
  const completedTasks = data.tasks.length - pendingTasks;
  const { brl: totalBRL, eur: totalEUR } = calculateUnpaidExpenseTotals(data.expenses);
  const expenseByTaskId = new Map(data.expenses.flatMap((expense) => expense.taskId ? [[expense.taskId, expense] as const] : []));
  const totalInBRL = rate === null ? null : totalBRL + totalEUR * rate;
  const totalInEUR = rate === null ? null : totalEUR + totalBRL / rate;
  const nextTask = sortedTasks.find((task) => !task.completed && task.dueDate);

  function openEditor(next: Exclude<EditorState, null>) {
    setFormError(null);
    setEditor(next);
  }

  function closeEditor() {
    setFormError(null);
    setEditor(null);
  }

  function updateTasks(updater: (tasks: MoveTask[]) => MoveTask[]) {
    updatePlannerData((current) => ({ ...current, tasks: updater(current.tasks) }));
  }

  function updateExpenses(updater: (expenses: MoveExpense[]) => MoveExpense[]) {
    updatePlannerData((current) => ({ ...current, expenses: updater(current.expenses) }));
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editor?.kind !== "task") return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const dueDate = String(form.get("dueDate") ?? "");
    const rawAmount = String(form.get("amount") ?? "").trim();
    const parsedAmount = rawAmount ? parseBrazilianNumber(rawAmount) : null;
    const currency = String(form.get("currency") ?? "BRL");
    if (!name || !dueDate) {
      setFormError("Informe o nome e a data de vencimento da tarefa.");
      return;
    }
    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setFormError("Informe um valor maior que zero ou deixe o campo de valor em branco.");
      return;
    }
    if (currency !== "BRL" && currency !== "EUR") {
      setFormError("Escolha uma moeda válida para o valor da tarefa.");
      return;
    }
    const existing = editor.value;
    const task: MoveTask = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      dueDate,
      completed: existing?.completed ?? false,
    };
    const linkedExpense = expenseByTaskId.get(task.id);
    updatePlannerData((current) => upsertTaskAndLinkedExpense(
      current,
      task,
      parsedAmount === null ? null : Math.round(parsedAmount * 100) / 100,
      currency as MoveCurrency,
      linkedExpense ? linkedExpense.id : crypto.randomUUID(),
    ));
    setFormError(null);
    setEditor(null);
  }

  function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editor?.kind !== "expense") return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const rawAmount = parseBrazilianNumber(String(form.get("amount") ?? ""));
    const currency = String(form.get("currency") ?? "BRL");
    const dueDate = String(form.get("dueDate") ?? "");
    if (!name || !Number.isFinite(rawAmount) || rawAmount <= 0 || (currency !== "BRL" && currency !== "EUR")) {
      setFormError("Confira o nome, o valor e a moeda do gasto.");
      return;
    }
    const existing = editor.value;
    const expense: MoveExpense = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      amount: Math.round(rawAmount * 100) / 100,
      currency,
      dueDate,
      paid: existing?.paid ?? false,
      ...(existing?.taskId ? { taskId: existing.taskId } : {}),
    };
    updateExpenses((items) => existing
      ? items.map((item) => item.id === existing.id ? expense : item)
      : [...items, expense]);
    setFormError(null);
    setEditor(null);
  }

  function toggleTask(id: string) {
    updateTasks((tasks) => tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function removeTask(id: string) {
    updatePlannerData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
      expenses: unlinkExpensesForTask(current.expenses, id),
    }));
  }

  function removeExpense(id: string) {
    updatePlannerData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== id) }));
  }

  function toggleExpensePaid(id: string) {
    updateExpenses((items) => items.map((item) => item.id === id ? { ...item, paid: !item.paid } : item));
  }

  const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123c36] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2d28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a85b] focus-visible:ring-offset-2";
  const buttonSoft = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a85b]";
  const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f6b5e] focus:ring-4 focus:ring-[#1f6b5e]/10";
  const taskExpense = editor?.kind === "task" && editor.value ? expenseByTaskId.get(editor.value.id) : undefined;

  return (
    <main className="min-h-screen bg-[#f5f7f4] px-4 py-5 text-slate-900 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#123c36] px-6 py-7 text-white shadow-[0_20px_60px_-35px_rgba(18,60,54,.75)] sm:px-9 sm:py-9">
          <div className="absolute -right-12 -top-24 -z-10 size-72 rounded-full border-[40px] border-white/5" />
          <div className="absolute -bottom-36 right-36 -z-10 size-72 rounded-full bg-[#d7a85b]/10 blur-2xl" />
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-50">
                <MapPinned className="size-3.5 text-[#e9c27e]" /> PLANO PESSOAL · PORTUGAL
              </div>
              <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Uma mudança grande, organizada com calma.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50/75 sm:text-base">Junte as próximas etapas e os gastos da sua mudança em um só lugar.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 sm:min-w-56">
              <div className="grid size-11 place-items-center rounded-xl bg-[#d7a85b]/15 text-[#f0cc8b]"><Plane className="size-5" /></div>
              <div><p className="text-xs text-emerald-50/60">Próximo compromisso</p><p className="mt-0.5 max-w-40 truncate text-sm font-semibold">{nextTask?.name ?? "Tudo começa por aqui"}</p></div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><p className="text-xs text-emerald-50/65">Tarefas em aberto</p><p className="mt-1 text-2xl font-semibold">{pendingTasks}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><p className="text-xs text-emerald-50/65">Concluídas</p><p className="mt-1 text-2xl font-semibold">{completedTasks}</p></div>
          </div>
        </section>

        {storageError && <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>O navegador não conseguiu acessar o armazenamento local. Seus dados podem não ser salvos neste dispositivo.</p></div>}

        <nav aria-label="Seções do planejador" className="flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm sm:w-fit">
          <button type="button" onClick={() => setActiveSection("tasks")} aria-current={activeSection === "tasks" ? "page" : undefined} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition sm:flex-none ${activeSection === "tasks" ? "bg-[#123c36] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><ListChecks className="size-4" /> Tarefas <span className={`rounded-full px-2 py-0.5 text-xs ${activeSection === "tasks" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{pendingTasks}</span></button>
          <button type="button" onClick={() => setActiveSection("expenses")} aria-current={activeSection === "expenses" ? "page" : undefined} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition sm:flex-none ${activeSection === "expenses" ? "bg-[#123c36] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Receipt className="size-4" /> Gastos <span className={`rounded-full px-2 py-0.5 text-xs ${activeSection === "expenses" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{data.expenses.length}</span></button>
        </nav>

        {activeSection === "tasks" ? (
          <section aria-labelledby="tasks-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1f6b5e]">Passo a passo</p><h2 id="tasks-heading" className="mt-1 text-2xl font-semibold tracking-tight">Lista de tarefas</h2><p className="mt-1 text-sm text-slate-500">Prazos claros para cada etapa da mudança.</p></div>
              <button type="button" onClick={() => openEditor({ kind: "task" })} className={buttonPrimary}><Plus className="size-4" /> Nova tarefa</button>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              {sortedTasks.length ? <ul className="divide-y divide-slate-100">
                {sortedTasks.map((task) => {
                  const days = dueInDays(task.dueDate);
                  const alert = !task.completed && days !== null && days <= 10;
                  const taskExpense = expenseByTaskId.get(task.id);
                  return <li key={task.id} className={`flex items-start gap-3 px-4 py-4 sm:items-center sm:px-6 ${task.completed ? "bg-slate-50/70" : ""}`}>
                    <button type="button" onClick={() => toggleTask(task.id)} aria-label={task.completed ? `Reabrir tarefa: ${task.name}` : `Concluir tarefa: ${task.name}`} aria-pressed={task.completed} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition sm:mt-0 ${task.completed ? "border-[#1f6b5e] bg-[#1f6b5e] text-white" : "border-slate-300 text-transparent hover:border-[#1f6b5e]"}`}>{task.completed ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}</button>
                    <div className="min-w-0 flex-1"><p className={`font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.name}</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${task.completed ? "border-slate-200 bg-white text-slate-500" : dueColor(days)}`}><CalendarDays className="size-3.5" />{formatDate(task.dueDate)}</span>{!task.completed && dueLabel(days) && <span className={`font-medium ${alert ? days !== null && days <= 5 ? "text-red-700" : "text-amber-800" : "text-slate-400"}`}>{dueLabel(days)}</span>}{taskExpense && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${taskExpense.paid ? "bg-slate-100 text-slate-500 line-through" : "bg-emerald-50 text-emerald-700"}`}>{formatMoney(taskExpense.amount, taskExpense.currency)}{taskExpense.paid ? " · pago" : " · pendente"}</span>}</div></div>
                    <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => openEditor({ kind: "task", value: task })} aria-label={`Editar tarefa: ${task.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="size-4" /></button><button type="button" onClick={() => removeTask(task.id)} aria-label={`Excluir tarefa: ${task.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div>
                  </li>;
                })}
              </ul> : <div className="px-6 py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7efeb] text-[#1f6b5e]"><ListChecks className="size-6" /></div><h3 className="mt-4 font-semibold text-slate-800">Sua lista começa aqui</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Adicione tarefas e datas para acompanhar cada etapa da mudança.</p><button type="button" onClick={() => openEditor({ kind: "task" })} className={`${buttonSoft} mt-4`}><Plus className="size-4" /> Adicionar primeira tarefa</button></div>}
            </div>
            <div className="flex items-center gap-2 px-1 text-xs text-slate-500"><Clock3 className="size-4 text-[#1f6b5e]" /><span>Alertas: amarelo de 6 a 10 dias; vermelho até 5 dias e após o vencimento.</span></div>
          </section>
        ) : (
          <section aria-labelledby="expenses-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1f6b5e]">Planejamento financeiro</p><h2 id="expenses-heading" className="mt-1 text-2xl font-semibold tracking-tight">Controle de gastos</h2><p className="mt-1 text-sm text-slate-500">Registre despesas em real e euro, mantendo cada moeda original.</p></div>
              <button type="button" onClick={() => openEditor({ kind: "expense" })} className={buttonPrimary}><Plus className="size-4" /> Novo gasto</button>
            </div>

            <div className="grid gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7efeb] text-[#1f6b5e]"><Euro className="size-5" /></div><div><p className="font-semibold">Cotação utilizada</p><p className="mt-1 text-sm text-slate-500">Informe quantos reais equivalem a 1 euro.</p></div></div>
              <label className="block text-xs font-semibold text-slate-600">1 EUR = <span className="sr-only">Cotação em reais por euro</span><div className="mt-1.5 flex items-center gap-2"><input type="text" inputMode="decimal" value={exchangeInput} onChange={(event) => { const value = event.target.value; setExchangeDraft(value); const parsed = parseBrazilianNumber(value); if (Number.isFinite(parsed) && parsed > 0) updatePlannerData((current) => ({ ...current, exchangeRate: parsed })); }} onBlur={() => { if (rate !== null) setExchangeDraft(null); }} className="min-h-11 w-36 rounded-xl border border-slate-200 px-3 text-base font-semibold text-slate-900 outline-none focus:border-[#1f6b5e] focus:ring-4 focus:ring-[#1f6b5e]/10" aria-invalid={rate === null} /><span className="text-sm font-medium text-slate-500">BRL</span></div></label>
              {rate === null && <p role="alert" className="text-xs text-red-600 sm:col-span-2">Digite uma cotação maior que zero para calcular os totais.</p>}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              {data.expenses.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[.13em] text-slate-500"><tr><th className="px-5 py-3.5">Despesa</th><th className="px-5 py-3.5">Vencimento</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Valor</th><th className="px-5 py-3.5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{data.expenses.map((expense) => <tr key={expense.id} className={`transition ${expense.paid ? "bg-slate-50/70 text-slate-400" : "hover:bg-slate-50/70"}`}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-xl ${expense.paid ? "bg-slate-100 text-slate-400" : expense.currency === "EUR" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{expense.currency === "EUR" ? <Euro className="size-4" /> : <Wallet className="size-4" />}</div><div><p className={`font-medium ${expense.paid ? "text-slate-400 line-through" : "text-slate-800"}`}>{expense.name}</p><p className="mt-0.5 text-xs text-slate-400">{expense.currency === "EUR" ? "Euro" : "Real brasileiro"}{expense.taskId ? " · vinculada a uma tarefa" : ""}</p></div></div></td><td className={`px-5 py-4 text-sm ${expense.paid ? "text-slate-400 line-through" : "text-slate-500"}`}>{expense.dueDate ? formatDate(expense.dueDate) : "Sem vencimento"}</td><td className="px-5 py-4"><button type="button" onClick={() => toggleExpensePaid(expense.id)} aria-label={expense.paid ? `Marcar ${expense.name} como não pago` : `Marcar ${expense.name} como pago`} aria-pressed={expense.paid} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${expense.paid ? "bg-slate-200 text-slate-600 hover:bg-slate-300" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>{expense.paid ? "Pago" : "Em aberto"}</button></td><td className={`px-5 py-4 text-right font-semibold tabular-nums ${expense.paid ? "text-slate-400 line-through" : "text-slate-800"}`}>{formatMoney(expense.amount, expense.currency)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditor({ kind: "expense", value: expense })} aria-label={`Editar gasto: ${expense.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="size-4" /></button><button type="button" onClick={() => removeExpense(expense.id)} aria-label={`Excluir gasto: ${expense.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7efeb] text-[#1f6b5e]"><Receipt className="size-6" /></div><h3 className="mt-4 font-semibold text-slate-800">Nenhum gasto adicionado</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Inclua despesas da mudança em BRL ou EUR para acompanhar o orçamento.</p><button type="button" onClick={() => openEditor({ kind: "expense" })} className={`${buttonSoft} mt-4`}><Plus className="size-4" /> Adicionar primeiro gasto</button></div>}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="relative overflow-hidden rounded-3xl bg-[#123c36] p-5 text-white shadow-sm sm:p-6"><div className="absolute -right-8 -top-8 size-32 rounded-full border-[22px] border-white/5" /><div className="relative flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-emerald-50/70">Total geral em reais</p><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{totalInBRL === null ? "—" : formatMoney(totalInBRL, "BRL")}</p></div><div className="grid size-11 place-items-center rounded-xl bg-white/10 text-[#e9c27e]"><Wallet className="size-5" /></div></div><div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-xs text-emerald-50/65"><span>BRL original: {formatMoney(totalBRL, "BRL")}</span><span>·</span><span>EUR original: {formatMoney(totalEUR, "EUR")}</span></div></div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">Total geral em euros</p><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-4xl">{totalInEUR === null ? "—" : formatMoney(totalInEUR, "EUR")}</p></div><div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Euro className="size-5" /></div></div><div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>EUR original: {formatMoney(totalEUR, "EUR")}</span><span>·</span><span>BRL original: {formatMoney(totalBRL, "BRL")}</span></div></div>
            </div>
            <p className="flex items-center gap-2 px-1 text-xs text-slate-500"><ArrowDownRight className="size-4 text-[#1f6b5e]" />Os totais incluem apenas gastos em aberto; os pagos ficam riscados na lista e não entram na soma.</p>
          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Dados armazenados neste navegador e neste dispositivo.</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#1f6b5e]" />Atualização automática dos totais</span></footer>
      </div>

      {editor && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="editor-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1f6b5e]">Planejamento Portugal</p><h2 id="editor-title" className="mt-1 text-xl font-semibold text-slate-900">{editor.kind === "task" ? editor.value ? "Editar tarefa" : "Nova tarefa" : editor.value ? "Editar gasto" : "Novo gasto"}</h2></div><button type="button" onClick={closeEditor} aria-label="Fechar" className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="size-5" /></button></div>
          {formError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">{formError}</p>}
          {editor.kind === "task" ? <form className="mt-6 space-y-4" onSubmit={saveTask}><label className="block text-sm font-medium text-slate-700">Nome da tarefa<input autoFocus required maxLength={120} name="name" defaultValue={editor.value?.name ?? ""} placeholder="Ex.: Renovar passaporte" className={inputClass} /></label><label className="block text-sm font-medium text-slate-700">Data de vencimento<input required type="date" name="dueDate" defaultValue={editor.value?.dueDate ?? ""} className={inputClass} /></label><div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-sm font-semibold text-slate-800">Valor da tarefa <span className="font-normal text-slate-400">(opcional)</span></p><div className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr]"><label className="block text-sm font-medium text-slate-700">Valor<input type="text" inputMode="decimal" name="amount" defaultValue={taskExpense?.amount.toFixed(2).replace(".", ",") ?? ""} placeholder="Ex.: 500,00" className={inputClass} /></label><label className="block text-sm font-medium text-slate-700">Moeda<select name="currency" defaultValue={taskExpense?.currency ?? "BRL"} className={inputClass}><option value="BRL">Real (BRL)</option><option value="EUR">Euro (EUR)</option></select></label></div><p className="mt-2 text-xs leading-5 text-slate-500">Ao informar um valor, ele também entra em Gastos como pago, vinculado a esta tarefa, e não será somado aos totais. Deixe em branco se não houver custo.</p></div><div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={closeEditor} className={buttonSoft}>Cancelar</button><button type="submit" className={buttonPrimary}><Check className="size-4" />Salvar tarefa</button></div></form> : <form className="mt-6 space-y-4" onSubmit={saveExpense}><label className="block text-sm font-medium text-slate-700">Nome do gasto<input autoFocus required maxLength={120} name="name" defaultValue={editor.value?.name ?? ""} placeholder="Ex.: Tradução juramentada" className={inputClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Valor<input required type="text" inputMode="decimal" name="amount" defaultValue={editor.value?.amount.toFixed(2).replace(".", ",") ?? ""} placeholder="0,00" className={inputClass} /></label><label className="block text-sm font-medium text-slate-700">Moeda<select name="currency" defaultValue={editor.value?.currency ?? "BRL"} className={inputClass}><option value="BRL">Real brasileiro (BRL)</option><option value="EUR">Euro (EUR)</option></select></label></div><label className="block text-sm font-medium text-slate-700">Data de vencimento <span className="font-normal text-slate-400">(opcional)</span><input type="date" name="dueDate" defaultValue={editor.value?.dueDate ?? ""} className={inputClass} /></label><p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-500">Use vírgula nos centavos, por exemplo 1.250,50. O gasto será mostrado na moeda original.</p><div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={closeEditor} className={buttonSoft}>Cancelar</button><button type="submit" className={buttonPrimary}><Check className="size-4" />Salvar gasto</button></div></form>}
        </section>
      </div>}
    </main>
  );
}
