export function YoutubeScoreRing({ score, small = false }: { score: number; small?: boolean }) {
  const value = Math.max(0, Math.min(100, score));
  return (
    <div
      className={small ? "yt-score-ring is-small" : "yt-score-ring"}
      style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}
      aria-label={`Potencial editorial ${value} de 100`}
    >
      <span>{value}</span>
      {small ? null : <small>/100</small>}
    </div>
  );
}
