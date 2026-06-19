import type { ChampionshipStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ChampionshipStatus, { label: string; className: string }> = {
  inscricoes_abertas: { label: "Inscrições abertas", className: "bg-emerald-100 text-emerald-700" },
  em_andamento: { label: "Em andamento", className: "bg-amber-100 text-amber-700" },
  encerrado: { label: "Encerrado", className: "bg-red-100 text-red-600" },
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-500" },
};

export function StatusBadge({ status }: { status: ChampionshipStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
