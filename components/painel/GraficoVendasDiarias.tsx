"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/format";
import type { DiaVenda } from "@/app/painel/campeonatos/[id]/financeiro/page";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload[0].value;
  const count = payload[1]?.value ?? 0;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-blue-600 font-bold">{formatBRL(total)}</p>
      <p className="text-gray-400">{count} inscriç{count === 1 ? "ão" : "ões"}</p>
    </div>
  );
}

export function GraficoVendasDiarias({ dados }: { dados: DiaVenda[] }) {
  if (dados.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-6">
        Sem dados para exibir ainda.
      </p>
    );
  }

  const temVendas = dados.some((d) => d.total > 0);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: Math.max(dados.length * 28, 300) }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dados} barSize={16} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={dados.length > 30 ? Math.floor(dados.length / 15) : 0}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
            {/* Bar invisível para passar o count ao tooltip */}
            <Bar dataKey="count" fill="transparent" legendType="none" />
            <Bar
              dataKey="total"
              fill={temVendas ? "#3b82f6" : "#e5e7eb"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
