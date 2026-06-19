import type { RatingPoint } from "@/lib/types";

// Gráfico simples de evolução do rating (ftv.md 8.5). SVG feito à mão, sem
// dependência de lib de gráfico — é só uma linha com 6 pontos, não precisa de
// mais que isso.
export function RatingSparkline({ points }: { points: RatingPoint[] }) {
  const w = 280;
  const h = 72;
  const pad = 10;
  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.rating - min) / range) * (h - pad * 2);
    return { x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-18 w-full text-blue-600">
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3} className="fill-blue-600" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        {points.map((p) => (
          <span key={p.mes}>{p.mes}</span>
        ))}
      </div>
    </div>
  );
}
