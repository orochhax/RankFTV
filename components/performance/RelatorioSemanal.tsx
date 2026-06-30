"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";
import { labelSemana, pct } from "@/lib/performance";
import { salvarRelatorio } from "@/app/admin/performance/actions";

export type WeeklyReport = {
  id: string;
  semana_inicio: string;
  nota: number | null;
  respostas: Record<string, unknown>;
  fechado: boolean;
};

type WeekStats = {
  aderenciaSemana: number;
  diasRegistrados: number;
  melhorHabito: string | null;
  habitoFraco: string | null;
};

type Props = {
  relatorioAtual: WeeklyReport | null;
  historico: WeeklyReport[];
  semanaAtual: string; // "yyyy-mm-dd" Monday
  stats: WeekStats;
};

export function RelatorioSemanal({ relatorioAtual, historico, semanaAtual, stats }: Props) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div>
        <h2 className="font-semibold text-gray-900">Relatório semanal</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Reflexão da semana de {labelSemana(semanaAtual)} — trava automaticamente na segunda-feira.
        </p>
      </div>

      <FormSemanaAtual relatorio={relatorioAtual} semana={semanaAtual} stats={stats} />

      {historico.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Histórico</p>
          <ul className="space-y-2">
            {historico.map((r) => (
              <HistoricoItem key={r.id} report={r} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Formulário da semana atual ─────────────────────────────────────────────────
function FormSemanaAtual({
  relatorio,
  semana,
  stats,
}: {
  relatorio: WeeklyReport | null;
  semana: string;
  stats: WeekStats;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [nota, setNota] = useState<number | null>(relatorio?.nota ?? null);
  const respostas = (relatorio?.respostas ?? {}) as Record<string, string>;

  function action(formData: FormData) {
    if (nota !== null) formData.set("nota", String(nota));
    formData.set("aderencia_semana", String(stats.aderenciaSemana));
    formData.set("dias_registrados", String(stats.diasRegistrados));
    if (stats.melhorHabito) formData.set("melhor_habito", stats.melhorHabito);
    if (stats.habitoFraco) formData.set("habito_fraco", stats.habitoFraco);

    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const res = await salvarRelatorio(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="semana_inicio" value={semana} />

      {/* Chips de stats (pré-preenchidos, contexto) */}
      <div className="flex flex-wrap gap-2">
        <StatChip
          label="Aderência"
          value={`${pct(stats.aderenciaSemana)}%`}
          color={stats.aderenciaSemana >= 0.7 ? "green" : stats.aderenciaSemana >= 0.5 ? "amber" : "red"}
        />
        <StatChip label="Dias" value={`${stats.diasRegistrados}/7`} color="gray" />
        {stats.melhorHabito && <StatChip label="Melhor" value={stats.melhorHabito} color="green" />}
        {stats.habitoFraco && stats.habitoFraco !== stats.melhorHabito && (
          <StatChip label="Fraco" value={stats.habitoFraco} color="red" />
        )}
      </div>

      {/* Nota 0–10 */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-600">Nota da semana (0–10)</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNota(nota === i ? null : i)}
              className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                nota === i
                  ? i >= 7
                    ? "bg-blue-500 text-white"
                    : i >= 5
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <Pergunta
        name="o_que_foi_bem"
        label="O que foi bem essa semana?"
        defaultValue={respostas.o_que_foi_bem}
      />
      <Pergunta
        name="o_que_melhorar"
        label="O que pode melhorar?"
        defaultValue={respostas.o_que_melhorar}
      />
      <Pergunta
        name="foco_proxima"
        label="Foco da próxima semana"
        defaultValue={respostas.foco_proxima}
      />

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {salvo ? "Salvo!" : "Salvar relatório"}
      </button>
    </form>
  );
}

// ── Pergunta de texto ──────────────────────────────────────────────────────────
function Pergunta({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={2}
        placeholder="Escreva aqui…"
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// ── Chip de stat ───────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "amber" | "red" | "gray";
}) {
  const colors = {
    green: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red:   "bg-red-50 text-red-700",
    gray:  "bg-gray-100 text-gray-600",
  };
  return (
    <div className={`rounded-lg px-2.5 py-1 text-xs ${colors[color]}`}>
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}

// ── Item do histórico (acordeão) ──────────────────────────────────────────────
function HistoricoItem({ report }: { report: WeeklyReport }) {
  const [aberto, setAberto] = useState(false);
  const r = report.respostas as Record<string, unknown>;
  const adh = typeof r.aderencia_semana === "number" ? r.aderencia_semana : null;

  const notaCor =
    report.nota == null
      ? "text-gray-400"
      : report.nota >= 7
      ? "text-blue-600"
      : report.nota >= 5
      ? "text-amber-600"
      : "text-red-600";

  const LABELS: Record<string, string> = {
    o_que_foi_bem:  "O que foi bem",
    o_que_melhorar: "O que pode melhorar",
    foco_proxima:   "Foco da próxima semana",
  };

  const temResposta = ["o_que_foi_bem", "o_que_melhorar", "foco_proxima"].some(
    (k) => typeof r[k] === "string" && (r[k] as string).trim(),
  );

  return (
    <li className="rounded-xl ring-1 ring-black/5">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {aberto ? (
            <ChevronDown className="size-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-gray-400" />
          )}
          <span className="text-sm text-gray-700">Sem. de {labelSemana(report.semana_inicio)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          {adh !== null && (
            <span
              className={
                adh >= 0.7
                  ? "text-blue-600"
                  : adh >= 0.5
                  ? "text-amber-600"
                  : "text-red-600"
              }
            >
              {pct(adh)}%
            </span>
          )}
          {report.nota != null && (
            <span className={`font-semibold ${notaCor}`}>nota {report.nota}</span>
          )}
        </div>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          {Object.entries(LABELS).map(([k, rotulo]) => {
            const txt = typeof r[k] === "string" ? (r[k] as string).trim() : null;
            if (!txt) return null;
            return (
              <div key={k}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{rotulo}</p>
                <p className="mt-0.5 text-sm text-gray-700">{txt}</p>
              </div>
            );
          })}
          {!temResposta && (
            <p className="text-sm italic text-gray-400">Nenhuma resposta registrada.</p>
          )}
        </div>
      )}
    </li>
  );
}
