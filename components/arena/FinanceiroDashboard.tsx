"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, CalendarDays, Clock, X } from "lucide-react";

type ReceitaMes = { label: string; valor: number };
type PresencaDia = { dow: number; label: string; count: number };
type ClasseDetalhe = { id: string; titulo: string; horario: string | null; totalPresencas: number };
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
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
          <div className="mb-2 flex items-center gap-1.5 text-blue-200">
            <DollarSign className="size-4" />
            <span className="text-xs font-semibold">Faturamento previsto</span>
          </div>
          <p className="text-2xl font-black leading-none">
            {fmt(faturamentoPrevisto)}
          </p>
          <p className="mt-1 text-xs text-blue-200">mês corrente</p>
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
          <DollarSign className="size-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Receita — últimos 6 meses</h3>
        </div>
        <div className="flex h-28 items-end gap-2">
          {receitaMensal.map((r, i) => {
            const pct = Math.max(Math.round((r.valor / maxReceita) * 100), r.valor > 0 ? 4 : 1);
            const isLast = i === receitaMensal.length - 1;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                {r.valor > 0 && (
                  <span className="text-[9px] font-semibold text-gray-400">
                    {r.valor >= 1000
                      ? `${(r.valor / 1000).toFixed(1)}k`
                      : r.valor.toFixed(0)}
                  </span>
                )}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${isLast ? "bg-blue-600" : "bg-blue-200"}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] capitalize text-gray-400">{r.label}</span>
              </div>
            );
          })}
        </div>
        {receitaMensal.every((r) => r.valor === 0) && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Nenhuma mensalidade paga registrada ainda.
          </p>
        )}
      </div>

      {/* ── Gráfico semanal interativo ── */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="mb-1 flex items-center gap-2">
          <CalendarDays className="size-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Alunos por dia da semana</h3>
        </div>
        <p className="mb-4 text-xs text-gray-400">Últimos 30 dias · Clique num dia para ver os horários</p>

        <div className="flex h-28 items-end gap-1.5">
          {presencasSemanal.map((p) => {
            const pct = Math.max(Math.round((p.count / maxPresenca) * 100), p.count > 0 ? 4 : 1);
            const selected = selectedDow === p.dow;
            return (
              <button
                key={p.dow}
                onClick={() => setSelectedDow(selected ? null : p.dow)}
                className="group flex flex-1 flex-col items-center gap-1 focus:outline-none"
              >
                {p.count > 0 && (
                  <span className="text-[9px] font-semibold text-gray-400 group-hover:text-blue-600">
                    {p.count}
                  </span>
                )}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      selected
                        ? "bg-blue-600"
                        : p.count > 0
                        ? "bg-blue-200 group-hover:bg-blue-400"
                        : "bg-gray-100"
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    selected ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detalhe do dia selecionado */}
        {detalheDia && (
          <div className="mt-4 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">
                  {presencasSemanal.find((p) => p.dow === selectedDow)?.label} — horários
                </span>
              </div>
              <button
                onClick={() => setSelectedDow(null)}
                className="rounded-full p-1 text-blue-400 hover:bg-blue-200"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {detalheDia.classes.length === 0 ? (
              <p className="text-xs text-blue-400">Nenhuma aula configurada para este dia.</p>
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
                          {cl.horario && <span className="mr-2 text-gray-400">{cl.horario}</span>}
                          {cl.totalPresencas} presença{cl.totalPresencas !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
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
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Ranking de presença — últimos 30 dias</h3>
        </div>

        {rankingAlunos.length === 0 ? (
          <p className="text-center text-xs text-gray-400">Nenhuma presença registrada ainda.</p>
        ) : (
          <ol className="space-y-2">
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
                  <TrendingUp className="size-4 shrink-0 text-emerald-500" />
                )}
                {a.trend === "down" && (
                  <TrendingDown className="size-4 shrink-0 text-red-400" />
                )}
                {a.trend === "same" && (
                  <Minus className="size-4 shrink-0 text-gray-300" />
                )}
                {a.trend === "new" && (
                  <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                    novo
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

    </div>
  );
}
