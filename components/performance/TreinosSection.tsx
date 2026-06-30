"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronDown, ChevronUp, Loader2,
  Minus, Target, Trash2, TrendingDown, TrendingUp,
} from "lucide-react";
import {
  registrarTreino, removerTreino, definirMetaTreinos,
  registrarTeste, removerTeste,
} from "@/app/admin/performance/actions";

type Treino = {
  id: string; data: string; tipo: string;
  duracao_min: number | null; obs: string | null;
};

type Teste = {
  id: string; data: string; tipo_teste: string;
  valor: number; unidade: string | null;
};

type Props = {
  treinos: Treino[];
  testes: Teste[];
  treinosMeta: number | null;
  hoje: string;
  segunda: string;
};

const TIPO_LABEL: Record<string, string> = {
  tecnico: "Técnico", fisico: "Físico", jogo: "Jogo",
};
const TIPO_CLS: Record<string, string> = {
  tecnico: "bg-blue-100 text-blue-700",
  fisico:  "bg-amber-100 text-amber-700",
  jogo:    "bg-blue-100 text-blue-700",
};

export function TreinosSection({ treinos, testes, treinosMeta, hoje, segunda }: Props) {
  const treinosEssaSemana = treinos.filter((t) => t.data >= segunda && t.data <= hoje).length;
  const metaOk = treinosMeta != null && treinosEssaSemana >= treinosMeta;
  const progress = treinosMeta ? Math.min(1, treinosEssaSemana / treinosMeta) : 0;

  // Agrupa testes por tipo (já vêm ordenados date desc da página)
  const porTipo: Record<string, Teste[]> = {};
  for (const t of testes) (porTipo[t.tipo_teste] ??= []).push(t);

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-6">
      <h2 className="font-semibold text-gray-900">Treinos & Testes</h2>

      {/* ── Treinos ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Treinos</p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Chip
            label="Esta semana"
            value={treinosMeta ? `${treinosEssaSemana}/${treinosMeta}` : String(treinosEssaSemana)}
            color={metaOk ? "green" : treinosEssaSemana > 0 ? "amber" : "gray"}
          />
          {treinosMeta && <Chip label="Meta" value={`${treinosMeta}/sem`} color="gray" />}
          <MetaTreinosForm key={`mt-${treinosMeta}`} treinosMeta={treinosMeta} />
        </div>

        {treinosMeta != null && (
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                metaOk ? "bg-blue-500" : progress >= 0.5 ? "bg-amber-500" : "bg-blue-400"
              }`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        <AdicionarTreinoForm hoje={hoje} />

        {treinos.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {treinos.slice(0, 20).map((t) => <TreinoItem key={t.id} treino={t} />)}
            {treinos.length > 20 && (
              <li className="text-center text-xs text-gray-400">+ {treinos.length - 20} mais antigos</li>
            )}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-gray-400">Nenhum treino registrado ainda.</p>
        )}
      </div>

      {/* ── Testes físicos ── */}
      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Testes físicos</p>

        <AdicionarTesteForm hoje={hoje} />

        {Object.keys(porTipo).length > 0 ? (
          <div className="mt-4 space-y-5">
            {Object.entries(porTipo).map(([tipo, entries]) => (
              <TesteGrupo key={tipo} tipo={tipo} entries={entries} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-400">Nenhum teste registrado ainda.</p>
        )}
      </div>
    </section>
  );
}

// ── Item de treino ────────────────────────────────────────────────────────────
function TreinoItem({ treino }: { treino: Treino }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dataFmt = `${treino.data.slice(8)}/${treino.data.slice(5, 7)}`;

  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-black/5">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${TIPO_CLS[treino.tipo] ?? "bg-gray-100 text-gray-600"}`}>
        {TIPO_LABEL[treino.tipo] ?? treino.tipo}
      </span>
      <p className="flex-1 min-w-0 text-sm text-gray-700">
        <span className="text-xs text-gray-400">{dataFmt}</span>
        {treino.duracao_min != null && <> · <span className="font-medium">{treino.duracao_min} min</span></>}
        {treino.obs && <> · <span className="text-gray-500 truncate">{treino.obs}</span></>}
      </p>
      <button
        onClick={() => {
          if (!confirm("Remover este treino?")) return;
          startTransition(async () => { await removerTreino(treino.id); router.refresh(); });
        }}
        disabled={isPending}
        className="shrink-0 flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </li>
  );
}

// ── Grupo de testes por tipo ──────────────────────────────────────────────────
function TesteGrupo({ tipo, entries }: { tipo: string; entries: Teste[] }) {
  // entries são date desc; primeiro = mais recente, último = mais antigo
  const ultimo  = entries[0];
  const primeiro = entries[entries.length - 1];
  const tendencia = entries.length >= 2
    ? Math.abs(ultimo.valor - primeiro.valor) / (Math.abs(primeiro.valor) || 1) < 0.01
      ? "estavel" : ultimo.valor > primeiro.valor ? "subindo" : "caindo"
    : null;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-sm font-medium text-gray-800">{tipo}</p>
        {tendencia === "subindo"  && <TrendingUp   className="size-3.5 text-blue-500" />}
        {tendencia === "caindo"   && <TrendingDown  className="size-3.5 text-red-500" />}
        {tendencia === "estavel"  && <Minus         className="size-3.5 text-gray-300" />}
      </div>
      <ul className="space-y-1.5">
        {entries.map((e) => <TesteItem key={e.id} teste={e} />)}
      </ul>
    </div>
  );
}

function TesteItem({ teste }: { teste: Teste }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dataFmt = `${teste.data.slice(8)}/${teste.data.slice(5, 7)}`;

  return (
    <li className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
      <span className="text-xs text-gray-400 w-10 shrink-0">{dataFmt}</span>
      <span className="flex-1 text-sm font-semibold text-gray-800">
        {teste.valor}{teste.unidade ? ` ${teste.unidade}` : ""}
      </span>
      <button
        onClick={() => {
          if (!confirm("Remover este teste?")) return;
          startTransition(async () => { await removerTeste(teste.id); router.refresh(); });
        }}
        disabled={isPending}
        className="flex size-6 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
      </button>
    </li>
  );
}

// ── Form: meta de treinos semanais ────────────────────────────────────────────
function MetaTreinosForm({ treinosMeta }: { treinosMeta: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function action(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const res = await definirMetaTreinos(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
    });
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <Target className="size-3.5 shrink-0 text-blue-500" />
      <input
        name="treinos_semana_meta"
        type="number" min={1} max={14}
        defaultValue={treinosMeta ?? undefined}
        placeholder="Meta/sem"
        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" disabled={isPending}
        className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        {salvo ? "Salvo!" : "Meta"}
      </button>
    </form>
  );
}

// ── Form: registrar treino ────────────────────────────────────────────────────
function AdicionarTreinoForm({ hoje }: { hoje: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  function action(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const res = await registrarTreino(formData);
      if (res.ok) { setFormKey((k) => k + 1); setAberto(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  const inp = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <button onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">
        {aberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        {aberto ? "Fechar" : "Registrar treino"}
      </button>

      {aberto && (
        <form key={formKey} action={action} className="mt-3 space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Data</label>
              <input name="data" type="date" defaultValue={hoje} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
              <select name="tipo" defaultValue="tecnico" className={inp}>
                <option value="tecnico">Técnico</option>
                <option value="fisico">Físico</option>
                <option value="jogo">Jogo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Duração (min)</label>
              <input name="duracao_min" type="number" min={1} placeholder="60" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Observação</label>
              <input name="obs" type="text" placeholder="Opcional" className={inp} />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Salvar treino
          </button>
        </form>
      )}
    </div>
  );
}

// ── Form: registrar teste ─────────────────────────────────────────────────────
function AdicionarTesteForm({ hoje }: { hoje: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  function action(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const res = await registrarTeste(formData);
      if (res.ok) { setFormKey((k) => k + 1); setAberto(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  const inp = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <button onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">
        {aberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        {aberto ? "Fechar" : "Registrar teste"}
      </button>

      {aberto && (
        <form key={formKey} action={action} className="mt-3 space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Teste</label>
              <input name="tipo_teste" type="text" required placeholder="Ex.: Salto vertical, Sprint 30m" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Valor</label>
              <input name="valor" type="number" step="any" required placeholder="Ex.: 65" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Unidade</label>
              <input name="unidade" type="text" placeholder="cm, s, kg…" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Data</label>
              <input name="data" type="date" defaultValue={hoje} className={inp} />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Salvar teste
          </button>
        </form>
      )}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, value, color }: { label: string; value: string; color: "green" | "amber" | "gray" }) {
  const cls = { green: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", gray: "bg-gray-100 text-gray-600" };
  return (
    <div className={`rounded-lg px-2.5 py-1 text-xs ${cls[color]}`}>
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}
