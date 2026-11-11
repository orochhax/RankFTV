"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import type { DiaVenda } from "@/lib/financial-data-loader";

function formatEixoBRL(valor: number) {
  if (valor === 0) return "R$ 0";
  if (Math.abs(valor) < 1000) return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
  const milhares = valor / 1000;
  return `R$ ${milhares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
}

function RevenueTooltip({
  active,
  payload,
  label,
  mode,
  showValues,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload?: DiaVenda & { acumulado: number } }>;
  label?: string;
  mode: "diario" | "acumulado";
  showValues: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const val = mode === "acumulado" ? (row?.acumulado ?? 0) : (row?.total ?? 0);
  const count = row?.count ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-0.5 font-bold text-brand-ink">
        {showValues ? formatBRL(val) : "R$ ••••••"}
      </p>
      {mode === "diario" && (
        <p className="text-ink-muted">
          {count} venda{count === 1 ? "" : "s"} no dia
        </p>
      )}
    </div>
  );
}

function buildChartSeries(dados: DiaVenda[]) {
  const rows: Array<DiaVenda & { acumulado: number }> = [];
  let running = 0;
  for (const d of dados) {
    running += Number(d.total || 0);
    rows.push({
      ...d,
      acumulado: Math.round((running + Number.EPSILON) * 100) / 100,
    });
  }
  return rows;
}

export function RevenueEvolutionChart({
  dados,
  showValues,
}: {
  dados: DiaVenda[];
  showValues: boolean;
}) {
  const [mode, setMode] = useState<"diario" | "acumulado">("acumulado");

  const chartData = useMemo(() => buildChartSeries(dados), [dados]);

  const larguraMinima = Math.max(chartData.length * 16, 280);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Evolução da arrecadação</h3>
          <p className="text-xs text-ink-muted">
            Ritmo de inscrições confirmadas ao longo do campeonato.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("acumulado")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              mode === "acumulado"
                ? "bg-surface text-brand-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Acumulado
          </button>
          <button
            type="button"
            onClick={() => setMode("diario")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              mode === "diario"
                ? "bg-surface text-brand-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Por dia
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-ink-muted">
          Nenhuma venda registrada no período ainda.
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1">
          <div style={{ minWidth: larguraMinima }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rankftvRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5D00" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#FF5D00" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={showValues ? formatEixoBRL : () => "•••"}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                />
                <Tooltip
                  content={<RevenueTooltip mode={mode} showValues={showValues} />}
                />
                <Area
                  type="monotone"
                  dataKey={mode === "acumulado" ? "acumulado" : "total"}
                  stroke="#FF5D00"
                  strokeWidth={2.5}
                  fill="url(#rankftvRevGradient)"
                  activeDot={{ r: 5, fill: "#FF5D00", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

const EXPENSE_COLORS = ["#FF5D00", "#0E4937", "#72BF00", "#D97706", "#16A34A", "#3E685A", "#64748B"];

export function ExpenseCategoryDonut({
  porCategoria,
  total,
}: {
  porCategoria: Array<{ categoria: string; total: number; count: number; percentual: number }>;
  total: number;
}) {
  if (porCategoria.length === 0 || total <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <h3 className="text-sm font-bold text-ink">Custos por categoria</h3>
        <p className="mt-4 text-xs text-ink-muted">
          Lance despesas para visualizar a distribuição automática por centro de custo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-ink">Distribuição de despesas</h3>
        <p className="text-xs text-ink-muted">Peso de cada centro de custo no orçamento.</p>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={porCategoria}
              dataKey="total"
              nameKey="categoria"
              innerRadius={44}
              outerRadius={70}
              paddingAngle={2}
            >
              {porCategoria.map((item, idx) => (
                <Cell key={item.categoria} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatBRL(Number(value ?? 0))}
              contentStyle={{
                borderRadius: "12px",
                borderColor: "#e2e8f0",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 text-xs">
        {porCategoria.map((item, idx) => (
          <li key={item.categoria} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length] }}
              />
              <span className="truncate font-medium text-ink">{item.categoria}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-semibold text-ink">{formatBRL(item.total)}</span>
              <span className="ml-1.5 text-ink-muted">({item.percentual}%)</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
