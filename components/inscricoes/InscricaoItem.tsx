"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Atleta = {
  nome: string;
  username: string;
  nivel: string | null;
};

interface Props {
  a1: Atleta;
  a2: Atleta | null;
  catNome: string;
  catGenero: string;
  valor: number;
  statusPagamento: "pago" | "pendente" | "estornado";
}

const PAG_CFG = {
  pago:      { label: "Pago",          className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pendente:  { label: "Ag. pagamento", className: "bg-amber-100  text-amber-700",   icon: Clock },
  estornado: { label: "Estornado",     className: "bg-red-100    text-red-600",     icon: RotateCcw },
} as const;

const NIVEL_CORES: Record<string, string> = {
  iniciante:     "bg-sky-100 text-sky-700",
  intermediario: "bg-amber-100 text-amber-700",
  avancado:      "bg-orange-100 text-orange-700",
  profissional:  "bg-purple-100 text-purple-700",
};

function nivelLabel(nivel: string | null): string {
  if (!nivel) return "—";
  const map: Record<string, string> = {
    iniciante:     "Iniciante",
    intermediario: "Intermediário",
    avancado:      "Avançado",
    profissional:  "Profissional",
  };
  return map[nivel] ?? nivel;
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  const className = nivel ? (NIVEL_CORES[nivel] ?? "bg-gray-100 text-gray-500") : "bg-gray-100 text-gray-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {nivelLabel(nivel)}
    </span>
  );
}

export function InscricaoItem({ a1, a2, catNome, catGenero: _catGenero, valor, statusPagamento }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = PAG_CFG[statusPagamento] ?? PAG_CFG["pendente"];
  const StatusIcon = cfg.icon;

  const circleColor =
    statusPagamento === "pago"      ? "bg-emerald-100" :
    statusPagamento === "estornado" ? "bg-red-100"     : "bg-amber-100";
  const iconColor =
    statusPagamento === "pago"      ? "text-emerald-600" :
    statusPagamento === "estornado" ? "text-red-500"     : "text-amber-500";

  return (
    <li>
      {/* Linha principal — clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
        aria-expanded={open}
      >
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${circleColor}`}>
          <StatusIcon className={`size-4 ${iconColor}`} />
        </div>

        {/* Nomes dos dois atletas sempre visíveis */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">
            {a1.nome}{a2 && <span className="text-gray-400"> &amp;</span>}
          </p>
          {a2 ? (
            <p className="truncate font-medium text-gray-900">{a2.nome}</p>
          ) : (
            <p className="text-xs text-amber-500">Aguardando parceiro</p>
          )}
          <p className="mt-0.5 text-xs text-gray-400">{catNome}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold text-gray-900">{formatBRL(valor)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
          <ChevronDown
            className={`size-4 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Painel expandido */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AtletaCard atleta={a1} catNome={catNome} label="Atleta 1" />
            {a2 && <AtletaCard atleta={a2} catNome={catNome} label="Atleta 2" />}
          </div>
        </div>
      )}
    </li>
  );
}

function AtletaCard({ atleta, catNome, label }: { atleta: Atleta; catNome: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-black/5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="font-medium text-gray-900">{atleta.nome}</p>
      {atleta.username && (
        <p className="mb-3 text-xs text-gray-400">@{atleta.username}</p>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Nível sugerido</span>
          <NivelBadge nivel={atleta.nivel} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Se inscreveu em</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {catNome}
          </span>
        </div>
      </div>
    </div>
  );
}
