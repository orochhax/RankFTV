// Mini-gráfico da evolução de nível ao longo do tempo. SVG puro (sem libs).
// `valores` são as ORDENS dos níveis (1..max) em ordem cronológica; o eixo Y
// vai do nível mais baixo (embaixo) ao mais alto (em cima).

type Props = {
  valores: number[];
  max?: number; // maior ordem possível (9 níveis)
  className?: string;
};

export function EvolucaoSparkline({ valores, max = 9, className }: Props) {
  if (valores.length === 0) {
    return (
      <p className="py-4 text-center text-[11px] text-gray-500">
        Sem dados ainda
      </p>
    );
  }

  const W = 240;
  const H = 64;
  const pad = 8;
  const n = valores.length;

  const x = (i: number) =>
    n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v: number) => {
    const t = (v - 1) / Math.max(1, max - 1); // 0 (baixo) .. 1 (topo)
    return H - pad - t * (H - 2 * pad);
  };

  const linha = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${H - pad} ${linha} ${x(n - 1)},${H - pad}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className ?? "h-16 w-full"}
      role="img"
      aria-label="Gráfico de evolução de nível"
    >
      <defs>
        <linearGradient id="evolGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Linhas de grade horizontais discretas */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={W - pad}
          y1={pad + g * (H - 2 * pad)}
          y2={pad + g * (H - 2 * pad)}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-white/10"
        />
      ))}

      <polygon points={area} fill="url(#evolGrad)" />
      <polyline
        points={linha}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {valores.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#60a5fa" />
      ))}
    </svg>
  );
}
