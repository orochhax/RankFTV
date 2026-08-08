"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartNoAxesCombined,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import type { RouteProjectionPoint } from "@/components/performance/investments/types";
import {
  compactMoney,
  dateLabel,
  money,
  secondaryButtonClass,
  Surface,
} from "@/components/performance/investments/ui";

type ChartRow = RouteProjectionPoint & { range?: [number, number] };

export function InvestmentTrajectoryChart({
  points,
  today,
  targetDate,
  targetValue,
  valueModeLabel,
  assumptions,
  simulationActive,
  originalPlanConverted,
}: {
  points: RouteProjectionPoint[];
  today: string;
  targetDate: string;
  targetValue: number;
  valueModeLabel: string;
  assumptions: {
    conservative: number;
    base: number;
    favorable: number;
    inflation: number;
  };
  simulationActive: boolean;
  originalPlanConverted: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const rows = useMemo<ChartRow[]>(
    () =>
      points.map((point) => ({
        ...point,
        range:
          point.conservative != null && point.favorable != null
            ? [point.conservative, point.favorable]
            : undefined,
      })),
    [points],
  );
  const hasData = rows.some((row) =>
    [
      row.actual,
      row.originalPlan,
      row.currentPlan,
      row.currentRoute,
      row.simulation,
    ].some((value) => value != null),
  );
  const summary = hasData
    ? `O gráfico combina ${points.filter((point) => point.actual != null).length} pontos observados com trajetórias projetadas até ${dateLabel(targetDate)}. A faixa sombreada compara os cenários conservador e favorável.`
    : "Ainda não há dados suficientes para formar a trajetória da carteira.";

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined
              className="size-4 text-blue-300"
              aria-hidden="true"
            />
            <h2 className="font-semibold">Sua trajetória</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Passado observado, plano e futuros possíveis no mesmo mapa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAssumptions((value) => !value)}
          className={`${secondaryButtonClass} w-full px-3 py-2 text-xs sm:w-auto`}
          aria-expanded={showAssumptions}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Ver premissas da projeção
        </button>
      </div>
      {showAssumptions && (
        <div className="grid gap-2 border-b border-white/[0.08] bg-white/[0.018] px-4 py-3 text-xs text-white/60 sm:grid-cols-4 sm:px-5">
          <span>Conservador: {formatRate(assumptions.conservative)}</span>
          <span>Base: {formatRate(assumptions.base)}</span>
          <span>Favorável: {formatRate(assumptions.favorable)}</span>
          <span>Inflação: {formatRate(assumptions.inflation)}</span>
          <p className="sm:col-span-4">
            Taxas anuais líquidas · {valueModeLabel}. Aportes e retiradas
            projetados entram no fim do mês.
          </p>
        </div>
      )}
      <p id="investment-trajectory-summary" className="sr-only">
        {summary}
      </p>
      <div
        role="img"
        aria-labelledby="investment-chart-title"
        aria-describedby="investment-trajectory-summary"
        className="h-[330px] min-w-0 px-1 pt-4 sm:h-[430px] sm:px-3"
      >
        <span id="investment-chart-title" className="sr-only">
          Gráfico da trajetória patrimonial
        </span>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={42}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.68)" }}
                tickFormatter={shortDate}
              />
              <YAxis
                width={66}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.68)" }}
                tickFormatter={(value) => compactMoney(Number(value))}
              />
              <Tooltip
                labelFormatter={(label) => dateLabel(String(label))}
                formatter={(value, name) => [
                  Array.isArray(value)
                    ? `${money(Number(value[0]))} a ${money(Number(value[1]))}`
                    : money(Number(value)),
                  String(name),
                ]}
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "rgba(255,255,255,.68)", marginBottom: 6 }}
              />
              <Legend
                iconType="line"
                wrapperStyle={{
                  fontSize: 11,
                  color: "rgba(255,255,255,.58)",
                  paddingTop: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="range"
                name="Faixa de cenários"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.11}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Histórico real"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 3, fill: "#15191f", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="estimated"
                name="Ponte estimada"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="3 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="originalPlan"
                name={
                  originalPlanConverted
                    ? "Plano original (convertido)"
                    : "Plano original"
                }
                stroke="#93c5fd"
                strokeWidth={1.5}
                strokeDasharray="7 6"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="currentPlan"
                name="Plano vigente"
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="10 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="currentRoute"
                name="Ritmo atual"
                stroke="#34d399"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {simulationActive && (
                <Line
                  type="monotone"
                  dataKey="simulation"
                  name="Simulação"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  strokeDasharray="2 5"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              <ReferenceLine
                x={today}
                stroke="rgba(255,255,255,.38)"
                strokeDasharray="2 4"
                label={{
                  value: "Hoje",
                  position: "insideTopLeft",
                  fill: "rgba(255,255,255,.55)",
                  fontSize: 10,
                }}
              />
              <ReferenceDot
                x={targetDate}
                y={targetValue}
                r={5}
                fill="#fbbf24"
                stroke="#15191f"
                strokeWidth={2}
                label={{
                  value: "Meta",
                  position: "top",
                  fill: "#fcd34d",
                  fontSize: 10,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-white/50">
            Sua trajetória histórica aparecerá depois dos próximos check-ins.
          </div>
        )}
      </div>
      <div className="border-t border-white/[0.08] p-4 sm:p-5">
        <p className="text-xs leading-5 text-white/50">
          Projeções são estimativas baseadas nos seus dados e premissas. Elas
          não garantem resultados futuros. A faixa representa sensibilidade a
          três cenários, não uma probabilidade.
        </p>
        {originalPlanConverted && (
          <p className="mt-2 text-xs leading-5 text-white/50">
            O plano original foi convertido para o referencial monetário vigente
            usando as inflações configuradas. Essa comparação é aproximada e
            mantém a versão original preservada.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-expanded={showTable}
        >
          {showTable ? (
            <ChevronUp className="size-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4" aria-hidden="true" />
          )}{" "}
          {showTable
            ? "Ocultar alternativa em lista"
            : "Ver alternativa em lista"}
        </button>
        {showTable && (
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <caption className="sr-only">
                Valores da trajetória patrimonial por data
              </caption>
              <thead className="sticky top-0 bg-[#0f1318] text-white/65">
                <tr>
                  {[
                    "Data",
                    "Real",
                    "Ponte estimada",
                    originalPlanConverted
                      ? "Plano original (convertido)"
                      : "Plano original",
                    "Plano vigente",
                    "Ritmo atual",
                    "Conservador",
                    "Favorável",
                    ...(simulationActive ? ["Simulação"] : []),
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-3 py-2 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td className="whitespace-nowrap px-3 py-2 text-white/65">
                      {dateLabel(row.date)}
                    </td>
                    <MoneyCell value={row.actual} />
                    <MoneyCell value={row.estimated} />
                    <MoneyCell value={row.originalPlan} />
                    <MoneyCell value={row.currentPlan} />
                    <MoneyCell value={row.currentRoute} />
                    <MoneyCell value={row.conservative} />
                    <MoneyCell value={row.favorable} />
                    {simulationActive && <MoneyCell value={row.simulation} />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Surface>
  );
}

function MoneyCell({ value }: { value: number | null | undefined }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-white/65">
      {value == null ? "—" : money(value)}
    </td>
  );
}
function shortDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(".", "");
}
function formatRate(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}
const tooltipStyle = {
  background: "#0b0d10",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  boxShadow: "0 14px 35px rgba(0,0,0,.4)",
  fontSize: 12,
};
