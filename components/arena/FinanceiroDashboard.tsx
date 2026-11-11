"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, CalendarDays, Clock, X, ChevronDown, ChevronUp } from "lucide-react";

type ReceitaMes = { label: string; valor: number };
type PresencaDia = { dow: number; label: string; count: number };
type ClasseDetalhe = { id: string; titulo: string; horaInicio: string | null; totalPresencas: number };
type ClassePorDia = { dow: number; classes: ClasseDetalhe[] };
type AlunoRanking = {
  userId: string;
  nome: string;
  username: string;
  totalAulas: number;
  trend: "up" | "down" | "same" | "new";
};

export function FinanceiroDashboard({
  faturamentoPrevisto,
  numAlunos,
  receitaMensal,
  presencasSemanal,
  classesPorDia,
  rankingAlunos,
}: {
  faturamentoPrevisto: number;
  numAlunos: number;
  receitaMensal: ReceitaMes[];
  presencasSemanal: PresencaDia[];
  classesPorDia: ClassePorDia[];
  rankingAlunos: AlunoRanking[];
}) {
  const [selectedDow, setSelectedDow] = useState<number | null>(null);
  const [rankingAberto, setRankingAberto] = useState(true);

  const maxReceita = Math.max(...receitaMensal.map((r) => r.valor), 1);
  const maxPresenca = Math.max(...presencasSemanal.map((p) => p.count), 1);

  const detalheDia = selectedDow !== null
    ? classesPorDia.find((c) => c.dow === selectedDow)
    : null;

  function fmt(v: number) {
    return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  }

  return (
    <div className="space-y-6">

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-brand-dark p-4 text-white">
          <div className="mb-2 flex items-center gap-1.5 text-accent">
            <DollarSign className="size-4" />
            <span className="text-xs font-semibold">Faturamento previsto</span>
          </div>
          <p className="text-2xl font-black leading-none">
            {fmt(faturamentoPrevisto)}
          </p>
          <p className="mt-1 text-xs text-app-bg/75">mês corrente</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
          <div className="mb-2 flex items-center gap-1.5 text-gray-400">
            <Users className="size-4" />
            <span className="text-xs font-semibold text-gray-500">Alunos ativos</span>
          </div>
          <p className="text-2xl font-black leading-none text-gray-900">{numAlunos}</p>
          <p className="mt-1 text-xs text-gray-400">matriculados</p>
        </div>
      </div>

      {/* ── Gráfico mensal ── */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="size-4 text-brand" />
          <h3 className="text-sm font-semibold text-gray-700">Receita — últimos 6 meses</h3>
        </div>
        {receitaMensal.every((r) => r.valor === 0) ? (
          <p className="text-center text-xs text-gray-400">
            Nenhuma mensalidade paga registrada ainda.
          </p>
        ) : (
          <>
            {/* barras com altura em px para evitar problema de % em flex-grow */}
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {receitaMensal.map((r, i) => {
                const barH = r.valor > 0 ? Math.max(Math.round((r.valor / maxReceita) * 80), 4) : 2;
                const isLast = i === receitaMensal.length - 1;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end">
                    {r.valor > 0 && (
                      <span className="mb-1 text-[9px] font-semibold text-gray-400">
                        {r.valor >= 1000 ? `${(r.valor / 1000).toFixed(1)}k` : r.valor.toFixed(0)}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-lg ${isLast ? "bg-brand" : "bg-brand-border"}`}
                      style={{ height: barH }}
                    />
                  </div>
                );
              })}
            </div>
            {/* labels abaixo */}
            <div className="mt-1.5 flex gap-2">
              {receitaMensal.map((r, i) => (
                <span key={i} className="flex-1 text-center text-[10px] capitalize text-gray-400">
                  {r.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Gráfico semanal interativo ── */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="mb-1 flex items-center gap-2">
          <CalendarDays className="size-4 text-brand" />
          <h3 className="text-sm font-semibold text-gray-700">Alunos por dia da semana</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">Últimos 30 dias · Clique num dia para ver os horários</p>

        {/* barras em px + labels em linha separada */}
        <div className="flex items-end gap-1.5" style={{ height: 80 }}>
          {presencasSemanal.map((p) => {
            const barH = p.count > 0 ? Math.max(Math.round((p.count / maxPresenca) * 80), 4) : 2;
            const selected = selectedDow === p.dow;
            return (
              <button
                key={p.dow}
                onClick={() => setSelectedDow(selected ? null : p.dow)}
                className="group flex flex-1 flex-col items-center justify-end focus:outline-none"
              >
                {p.count > 0 && (
                  <span className="mb-1 text-[9px] font-semibold text-gray-400 group-hover:text-brand-ink">
                    {p.count}
                  </span>
                )}
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    selected
                      ? "bg-brand"
                      : p.count > 0
                      ? "bg-brand-border group-hover:bg-brand/75"
                      : "bg-gray-100"
                  }`}
                  style={{ height: barH }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {presencasSemanal.map((p) => (
            <span
              key={p.dow}
              className={`flex-1 text-center text-[10px] font-medium transition-colors ${
                selectedDow === p.dow ? "text-brand-ink" : "text-gray-400"
              }`}
            >
              {p.label}
            </span>
          ))}
        </div>

        {/* Detalhe do dia selecionado */}
        {detalheDia && (
          <div className="mt-4 rounded-xl bg-brand-soft p-4 ring-1 ring-brand-border">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-brand" />
                <span className="text-sm font-semibold text-ink">
                  {presencasSemanal.find((p) => p.dow === selectedDow)?.label} — horários
                </span>
              </div>
              <button
                onClick={() => setSelectedDow(null)}
                className="rounded-full p-1 text-brand-ink hover:bg-brand-border/40"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {detalheDia.classes.length === 0 ? (
              <p className="text-xs text-ink-muted">Nenhuma aula configurada para este dia.</p>
            ) : (
              <div className="space-y-2">
                {detalheDia.classes.map((cl) => {
                  const maxAulas = Math.max(...detalheDia.classes.map((c) => c.totalPresencas), 1);
                  const pct = Math.round((cl.totalPresencas / maxAulas) * 100);
                  return (
                    <div key={cl.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">{cl.titulo}</span>
                        <span className="text-gray-500">
                          {cl.horaInicio && <span className="mr-2 text-gray-400">{cl.horaInicio}</span>}
                          {cl.totalPresencas} presença{cl.totalPresencas !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border/40">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ranking de alunos ── */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <button
          onClick={() => setRankingAberto((v) => !v)}
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand" />
            <h3 className="text-sm font-semibold text-gray-700">Ranking de presença — últimos 30 dias</h3>
          </div>
          {rankingAberto ? (
            <ChevronUp className="size-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-gray-400" />
          )}
        </button>

        {rankingAberto && (rankingAlunos.length === 0 ? (
          <p className="mt-4 text-center text-xs text-gray-400">Nenhuma presença registrada ainda.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {rankingAlunos.map((a, i) => (
              <li
                key={a.userId}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5"
              >
                {/* Posição */}
                <span
                  className={`w-6 shrink-0 text-center text-sm font-bold ${
                    i === 0
                      ? "text-amber-500"
                      : i === 1
                      ? "text-gray-400"
                      : i === 2
                      ? "text-orange-400"
                      : "text-gray-300"
                  }`}
                >
                  {i + 1}
                </span>

                {/* Nome */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{a.nome}</p>
                  <p className="text-xs text-gray-400">@{a.username}</p>
                </div>

                {/* Aulas */}
                <span className="text-sm font-semibold text-gray-700">
                  {a.totalAulas} {a.totalAulas === 1 ? "aula" : "aulas"}
                </span>

                {/* Tendência */}
                {a.trend === "up" && (
                  <TrendingUp className="size-4 shrink-0 text-success" />
                )}
                {a.trend === "down" && (
                  <TrendingDown className="size-4 shrink-0 text-red-400" />
                )}
                {a.trend === "same" && (
                  <Minus className="size-4 shrink-0 text-gray-300" />
                )}
                {a.trend === "new" && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">
                    novo
                  </span>
                )}
              </li>
            ))}
          </ol>
        ))}
      </div>

    </div>
  );
}
