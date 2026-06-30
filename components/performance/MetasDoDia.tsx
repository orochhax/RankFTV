"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import {
  adherence, pct, type Habit,
} from "@/lib/performance";
import {
  registrarHabito, criarHabito, editarHabito, removerHabito, criarHabitosSugeridos,
} from "@/app/admin/performance/actions";

type Props = {
  habits: Habit[];
  valoresIniciais: Record<string, number>;
  hoje: string;
};

function corBarra(a: number): string {
  if (a >= 0.85) return "bg-blue-500";
  if (a >= 0.5)  return "bg-amber-500";
  return "bg-red-500";
}

export function MetasDoDia({ habits, valoresIniciais, hoje }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, number>>(valoresIniciais);
  const [isPending, startTransition] = useTransition();
  const [editMode, setEditMode] = useState(false);

  const ativos = habits.filter((h) => h.ativo);
  const dayAdh = ativos.length
    ? ativos.reduce((s, h) => s + adherence(h, valores[h.id]), 0) / ativos.length
    : 0;

  function commit(habitId: string, valor: number) {
    setValores((v) => ({ ...v, [habitId]: valor }));
    startTransition(async () => {
      await registrarHabito(habitId, valor, hoje);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Metas do dia</h2>
          <p className="text-xs text-gray-400">
            Marque o que fez — meio-feito conta como meio.
          </p>
        </div>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
        >
          {editMode ? <X className="size-3.5" /> : <Settings2 className="size-3.5" />}
          {editMode ? "Fechar" : "Editar lista"}
        </button>
      </div>

      {!editMode && ativos.length > 0 && (
        <>
          {/* Aderência do dia */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${corBarra(dayAdh)}`}
                style={{ width: `${pct(dayAdh)}%` }}
              />
            </div>
            <span className="w-12 text-right text-sm font-bold text-gray-900">{pct(dayAdh)}%</span>
            {isPending && <Loader2 className="size-4 animate-spin text-gray-300" />}
          </div>

          {/* Itens */}
          <ul className="mt-4 space-y-3">
            {ativos.map((h) => (
              <li key={h.id}>
                {h.tipo === "binario" ? (
                  <BinarioRow habit={h} valor={valores[h.id] ?? 0} onToggle={commit} />
                ) : (
                  <NumericoRow habit={h} valor={valores[h.id] ?? 0} onCommit={commit} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {!editMode && ativos.length === 0 && (
        <EmptyState />
      )}

      {editMode && <Editor habits={ativos} fecharEditor={() => setEditMode(false)} />}
    </section>
  );
}

// ── Linha binária (fez / não fez) ─────────────────────────────────────────────
function BinarioRow({
  habit, valor, onToggle,
}: { habit: Habit; valor: number; onToggle: (id: string, v: number) => void }) {
  const feito = valor >= 1;
  return (
    <button
      onClick={() => onToggle(habit.id, feito ? 0 : 1)}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ring-1 transition-colors ${
        feito ? "bg-blue-500 ring-blue-500" : "bg-white ring-gray-300"
      }`}>
        {feito && <Check className="size-4 text-white" />}
      </span>
      <span className={`text-sm ${feito ? "font-medium text-gray-900" : "text-gray-600"}`}>
        {habit.label}
      </span>
    </button>
  );
}

// ── Linha numérica (alvo vs. realizado) ───────────────────────────────────────
function NumericoRow({
  habit, valor, onCommit,
}: { habit: Habit; valor: number; onCommit: (id: string, v: number) => void }) {
  const [draft, setDraft] = useState(String(valor || ""));
  const a = adherence(habit, valor);

  function salvar() {
    const n = parseFloat(draft.replace(",", "."));
    const novo = Number.isFinite(n) && n >= 0 ? n : 0;
    if (novo !== valor) onCommit(habit.id, novo);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-700">{habit.label}</span>
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            min={0}
            step="any"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={salvar}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">/ {habit.alvo}{habit.unidade ? ` ${habit.unidade}` : ""}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${corBarra(a)}`} style={{ width: `${pct(a)}%` }} />
        </div>
        <span className="w-9 text-right text-xs text-gray-400">{pct(a)}%</span>
      </div>
    </div>
  );
}

// ── Estado vazio (sem hábitos ainda) ──────────────────────────────────────────
function EmptyState() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">Você ainda não montou sua lista de metas.</p>
      <button
        onClick={() => startTransition(async () => { await criarHabitosSugeridos(); router.refresh(); })}
        disabled={isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Usar lista sugerida
      </button>
    </div>
  );
}

// ── Editor da lista ───────────────────────────────────────────────────────────
function Editor({ habits, fecharEditor }: { habits: Habit[]; fecharEditor?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [showForm, setShowForm] = useState(false);

  function remover(id: string) {
    if (!confirm("Remover este hábito da lista? O histórico já registrado é mantido.")) return;
    startTransition(async () => { await removerHabito(id); router.refresh(); });
  }

  return (
    <div className="mt-4 space-y-3">
      <ul className="divide-y divide-gray-100 rounded-xl ring-1 ring-black/5">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{h.label}</p>
              <p className="text-xs text-gray-400">
                {h.tipo === "numerico" ? `Meta: ${h.alvo}${h.unidade ? ` ${h.unidade}` : ""}` : "Sim / não"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => { setEditing(h); setShowForm(false); }}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <Pencil className="size-4" />
              </button>
              <button onClick={() => remover(h.id)} disabled={isPending}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {habits.length === 0 && (
          <li className="px-3 py-3 text-sm text-gray-400">Nenhum hábito ainda.</li>
        )}
      </ul>

      {editing && (
        <HabitForm key={editing.id} habit={editing} onDone={() => setEditing(null)} />
      )}

      {!editing && (showForm ? (
        <HabitForm onDone={() => { setShowForm(false); fecharEditor?.(); }} />
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50">
          <Plus className="size-4" /> Adicionar hábito
        </button>
      ))}
    </div>
  );
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"binario" | "numerico">(habit?.tipo ?? "numerico");

  function action(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const res = habit ? await editarHabito(formData) : await criarHabito(formData);
      if (res.ok) { onDone(); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form action={action} className="space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <input name="label" defaultValue={habit?.label} placeholder="Nome (ex.: Sono)" required className={input} />
      <div className="flex gap-2">
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "binario" | "numerico")}
          className={`${input} bg-white`}>
          <option value="numerico">Meta numérica (alvo)</option>
          <option value="binario">Sim / não</option>
        </select>
      </div>
      {tipo === "numerico" && (
        <div className="flex gap-2">
          <input name="alvo" type="number" step="any" min={0} defaultValue={habit?.alvo ?? undefined}
            placeholder="Alvo (ex.: 8)" className={input} />
          <input name="unidade" defaultValue={habit?.unidade ?? undefined}
            placeholder="Unidade (h, min, L)" className={input} />
        </div>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Salvar
        </button>
        <button type="button" onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
