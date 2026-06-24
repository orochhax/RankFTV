"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Target } from "lucide-react";
import { registrarPeso, definirMetaPeso } from "@/app/admin/performance/actions";

type PesoEntry = { data: string; peso_kg: number };

type Props = {
  pesos: PesoEntry[];
  pesoMeta: number | null;
  hoje: string;
};

export function PesoCorpo({ pesos, pesoMeta, hoje }: Props) {
  const pesoAtual = pesos.length ? pesos[pesos.length - 1].peso_kg : null;
  const pesoInicial = pesos.length ? pesos[0].peso_kg : null;

  // Progresso rumo à meta
  let progress = 0;
  if (pesoMeta != null && pesoAtual != null && pesoInicial != null && pesoInicial !== pesoMeta) {
    const direction = pesoMeta > pesoInicial ? 1 : -1;
    const feito = (pesoAtual - pesoInicial) * direction;
    const needed = Math.abs(pesoMeta - pesoInicial);
    progress = Math.min(1, Math.max(0, feito / needed));
  } else if (pesoMeta != null && pesoAtual != null && pesoInicial === pesoMeta) {
    progress = 1;
  }

  const metaAtingida = pesoMeta != null && pesoAtual != null && Math.abs(pesoAtual - pesoMeta) < 0.15;
  const diffAbs = pesoMeta != null && pesoAtual != null ? Math.abs(pesoAtual - pesoMeta) : null;
  const perdendo = pesoMeta != null && pesoAtual != null && pesoMeta < pesoAtual;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="font-semibold text-gray-900">Peso & corpo</h2>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip label="Atual" value={pesoAtual ? `${pesoAtual} kg` : "—"} color="blue" />
        <Chip label="Meta" value={pesoMeta ? `${pesoMeta} kg` : "—"} color="green" />
        {diffAbs != null && !metaAtingida && (
          <Chip
            label={perdendo ? "Faltam perder" : "Faltam ganhar"}
            value={`${diffAbs.toFixed(1)} kg`}
            color="gray"
          />
        )}
        {pesoInicial != null && pesoAtual != null && pesoInicial !== pesoAtual && (
          <Chip
            label={pesoAtual < pesoInicial ? "Perdido" : "Ganho"}
            value={`${Math.abs(pesoAtual - pesoInicial).toFixed(1)} kg`}
            color={pesoAtual < pesoInicial ? "green" : "amber"}
          />
        )}
      </div>

      {/* Progress bar */}
      {pesoMeta != null && pesoAtual != null && pesoInicial != null && (
        <div className="mt-3">
          {metaAtingida ? (
            <p className="text-sm font-semibold text-emerald-600">Meta atingida!</p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
                <span>{pesoInicial} kg</span>
                <span className="font-medium text-gray-600">{Math.round(progress * 100)}% da jornada</span>
                <span>{pesoMeta} kg</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Gráfico */}
      {pesos.length >= 2 && (
        <div className="mt-4 overflow-hidden rounded-xl bg-gray-50 p-3">
          <WeightChart pesos={pesos} meta={pesoMeta} />
        </div>
      )}
      {pesos.length === 1 && (
        <p className="mt-3 text-xs text-gray-400">
          Registre mais um dia para ver o gráfico de evolução.
        </p>
      )}
      {pesos.length === 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Nenhum registro ainda. Salve seu peso de hoje para começar.
        </p>
      )}

      {/* Formulários */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3">
        <RegistrarForm key={pesoAtual ?? "null"} hoje={hoje} pesoAtual={pesoAtual} />
        <MetaForm key={`meta-${pesoMeta}`} pesoMeta={pesoMeta} />
      </div>
    </section>
  );
}

// ── Gráfico SVG de peso ───────────────────────────────────────────────────────
function WeightChart({ pesos, meta }: { pesos: PesoEntry[]; meta: number | null }) {
  const W = 320, H = 90;
  const PAD = { t: 18, b: 8, l: 30, r: 8 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const allKg = pesos.map((p) => p.peso_kg);
  if (meta != null) allKg.push(meta);
  const minKg = Math.min(...allKg) - 1;
  const maxKg = Math.max(...allKg) + 1;

  const ts = pesos.map((p) => new Date(p.data + "T12:00:00").getTime());
  const minT = ts[0], maxT = ts[ts.length - 1];
  const rangeT = maxT - minT || 1;

  const sx = (data: string) =>
    PAD.l + ((new Date(data + "T12:00:00").getTime() - minT) / rangeT) * cw;
  const sy = (kg: number) =>
    PAD.t + ch - ((kg - minKg) / (maxKg - minKg)) * ch;

  const points = pesos.map((p) => `${sx(p.data)},${sy(p.peso_kg)}`).join(" ");
  const metaY = meta != null ? sy(meta) : null;
  const last = pesos[pesos.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Meta (linha verde tracejada) */}
      {metaY != null && (
        <>
          <line
            x1={PAD.l} y1={metaY} x2={W - PAD.r} y2={metaY}
            stroke="#10b981" strokeWidth="1" strokeDasharray="5 3" opacity="0.8"
          />
          <text x={W - PAD.r - 2} y={metaY - 3} fontSize="7" fill="#10b981" textAnchor="end">
            meta {meta} kg
          </text>
        </>
      )}

      {/* Labels Y (mín / máx) */}
      <text x={PAD.l - 3} y={PAD.t + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
        {(maxKg - 1).toFixed(1)}
      </text>
      <text x={PAD.l - 3} y={PAD.t + ch + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
        {(minKg + 1).toFixed(1)}
      </text>

      {/* Linha azul */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Pontos */}
      {pesos.map((p, i) => (
        <circle key={i} cx={sx(p.data)} cy={sy(p.peso_kg)} r="2.5" fill="#3b82f6" />
      ))}

      {/* Último ponto destacado */}
      <circle
        cx={sx(last.data)} cy={sy(last.peso_kg)}
        r="4.5" fill="white" stroke="#3b82f6" strokeWidth="2"
      />
      {/* Label do último valor */}
      <text
        x={sx(last.data)} y={sy(last.peso_kg) - 8}
        fontSize="8.5" fill="#3b82f6" textAnchor="middle" fontWeight="bold"
      >
        {last.peso_kg} kg
      </text>
    </svg>
  );
}

// ── Mini-formulário: registrar peso de hoje ───────────────────────────────────
function RegistrarForm({ hoje, pesoAtual }: { hoje: string; pesoAtual: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function action(formData: FormData) {
    formData.set("data", hoje);
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const res = await registrarPeso(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <input
          name="peso_kg"
          type="number"
          step="0.1"
          min={0}
          defaultValue={pesoAtual ?? undefined}
          placeholder="Ex.: 82.5"
          className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">kg hoje</span>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {salvo ? "Salvo!" : "Salvar"}
        </button>
      </form>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}

// ── Mini-formulário: definir meta de peso ─────────────────────────────────────
function MetaForm({ pesoMeta }: { pesoMeta: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function action(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const res = await definirMetaPeso(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
    });
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <Target className="size-4 shrink-0 text-emerald-500" />
      <input
        name="peso_meta"
        type="number"
        step="0.1"
        min={0}
        defaultValue={pesoMeta ?? undefined}
        placeholder="Meta (kg)"
        className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        {salvo ? "Salvo!" : "Definir meta"}
      </button>
    </form>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "amber" | "gray";
}) {
  const cls = {
    blue:  "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    gray:  "bg-gray-100 text-gray-600",
  };
  return (
    <div className={`rounded-lg px-2.5 py-1 text-xs ${cls[color]}`}>
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}
