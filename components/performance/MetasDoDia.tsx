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
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";

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
    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Habitos de hoje</h2>
          <p className="text-xs text-white/35">
            Marque o que fez; meio feito conta como meio.
          </p>
        </div>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/45 hover:bg-white/[0.06] hover:text-white"
        >
          {editMode ? <X className="size-3.5" /> : <Settings2 className="size-3.5" />}
          {editMode ? "Fechar" : "Editar lista"}
        </button>
      </div>

      {!editMode && ativos.length > 0 && (
        <>
          {/* Aderência do dia */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${corBarra(dayAdh)}`}
                style={{ width: `${pct(dayAdh)}%` }}
              />
            </div>
            <span className="w-12 text-right text-sm font-bold text-white">{pct(dayAdh)}%</span>
            {isPending && <Loader2 className="size-4 animate-spin text-white/25" />}
          </div>

          {/* Itens */}
          <ul className={`mt-4 grid gap-x-8 gap-y-1 ${ativos.length > 5 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
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
      className="flex min-h-10 w-full items-center gap-3 border-b border-white/[0.06] py-1.5 text-left last:border-0"
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ring-1 transition-colors ${
        feito ? "bg-blue-500 ring-blue-500" : "bg-transparent ring-white/20"
      }`}>
        {feito && <Check className="size-4 text-white" />}
      </span>
      <span className={`text-sm ${feito ? "font-medium text-white" : "text-white/60"}`}>
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
    <div className="min-h-10 border-b border-white/[0.06] py-1.5 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/70">{habit.label}</span>
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
            className="w-16 rounded-lg border border-white/10 bg-[#0f1318] px-2 py-1 text-right text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-white/35">/ {habit.alvo}{habit.unidade ? ` ${habit.unidade}` : ""}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${corBarra(a)}`} style={{ width: `${pct(a)}%` }} />
        </div>
        <span className="w-9 text-right text-xs text-white/35">{pct(a)}%</span>
      </div>
    </div>
  );
}

// ── Estado vazio (sem hábitos ainda) ──────────────────────────────────────────
function EmptyState() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="mt-4 rounded-lg border border-dashed border-white/10 p-4 text-center">
      <p className="text-sm text-white/45">Voce ainda nao montou sua lista de habitos.</p>
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
  const confirm = usePerformanceConfirm();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function remover(habit: Habit) {
    const approved = await confirm({ title: "Arquivar habito?", description: `“${habit.label}” saira da sua lista diaria, mas todo o historico registrado sera preservado.`, confirmLabel: "Arquivar habito", tone: "primary" });
    if (!approved) return;
    startTransition(async () => { await removerHabito(habit.id); router.refresh(); });
  }

  return (
    <div className="mt-4 space-y-3">
      <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/10">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{h.label}</p>
              <p className="text-xs text-white/35">
                {h.tipo === "numerico" ? `Meta: ${h.alvo}${h.unidade ? ` ${h.unidade}` : ""}` : "Sim / não"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => { setEditing(h); setShowForm(false); }}
                className="flex size-8 items-center justify-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white">
                <Pencil className="size-4" />
              </button>
              <button onClick={() => remover(h)} disabled={isPending}
                className="flex size-8 items-center justify-center rounded-lg text-white/35 hover:bg-red-400/10 hover:text-red-300">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {habits.length === 0 && (
          <li className="px-3 py-3 text-sm text-white/35">Nenhum habito ainda.</li>
        )}
      </ul>

      {editing && (
        <HabitForm key={editing.id} habit={editing} onDone={() => setEditing(null)} />
      )}

      {!editing && (showForm ? (
        <HabitForm onDone={() => { setShowForm(false); fecharEditor?.(); }} />
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2.5 text-sm font-medium text-white/45 hover:bg-white/[0.04] hover:text-white">
          <Plus className="size-4" /> Adicionar habito
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

  const input = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:ring-2 focus:ring-blue-500 [&>option]:bg-[#15191f]";

  return (
    <form action={action} className="space-y-3 rounded-lg border border-white/10 bg-black/15 p-4">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <input name="label" defaultValue={habit?.label} placeholder="Nome (ex.: Sono)" required className={input} />
      <div className="flex gap-2">
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "binario" | "numerico")}
          className={input}>
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
      {erro && <p className="text-xs text-red-300">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Salvar
        </button>
        <button type="button" onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white/45 hover:bg-white/[0.06]">
          Cancelar
        </button>
      </div>
    </form>
  );
}
