"use client";

type Atleta = {
  nome: string;
  nivel: string | null;
};

interface Props {
  a1: Atleta;
  a2: Atleta | null;
  catNome: string;
}

const NIVEL_CFG: Record<string, { label: string; className: string }> = {
  iniciante:     { label: "Iniciante",     className: "bg-sky-100 text-sky-700" },
  intermediario: { label: "Intermediário", className: "bg-amber-100 text-amber-700" },
  avancado:      { label: "Avançado",      className: "bg-orange-100 text-orange-700" },
  profissional:  { label: "Profissional",  className: "bg-purple-100 text-purple-700" },
};

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel) return null;
  const cfg = NIVEL_CFG[nivel];
  if (!cfg) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function InscricaoItem({ a1, a2, catNome }: Props) {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      {/* Nomes */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">
          {a1.nome}
          {a2
            ? <span> <span className="text-gray-400">&amp;</span> {a2.nome}</span>
            : <span className="ml-1 text-xs font-normal text-amber-500">· Aguardando parceiro</span>
          }
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{catNome}</p>
      </div>

      {/* Nível */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <NivelBadge nivel={a1.nivel} />
        {a2 && <NivelBadge nivel={a2.nivel} />}
      </div>
    </li>
  );
}
