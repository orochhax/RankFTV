import type { RoundDisplay } from "@/app/painel/campeonatos/[id]/chaveamento/page";

/* ─── constantes de layout ─── */
const CW    = 220;  // largura do card
const CH    = 86;   // altura do card
const CS    = 94;   // slot por confronto (CH + 8px gap)
const CONN  = 44;   // largura da coluna de conector
const HDR   = 36;   // altura do cabeçalho (nome da rodada)
const PAD   = 28;   // padding externo
const SCALE = 2;    // densidade de pixel (qualidade 2×)

const ptFor  = (ri: number) => (Math.pow(2, ri) * CS - CH) / 2;
const gapFor = (ri: number) =>  Math.pow(2, ri) * CS - CH;

/* ─── helpers ─── */

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/* ─── resultado da função ─── */
export type BracketExport = { dataUrl: string; logicalW: number; logicalH: number };

/* ─── função principal ─── */
export function drawBracket(rounds: RoundDisplay[]): BracketExport {
  const nRounds    = rounds.length;
  const firstCount = rounds[0]?.matches.length ?? 1;

  const logicalW = PAD * 2 + nRounds * CW + Math.max(0, nRounds - 1) * CONN;
  const logicalH =
    PAD * 2 + HDR + ptFor(0) +
    firstCount * CH +
    Math.max(0, firstCount - 1) * gapFor(0);

  const canvas  = document.createElement("canvas");
  canvas.width  = logicalW * SCALE;
  canvas.height = logicalH * SCALE;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  /* fundo */
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, logicalW, logicalH);

  rounds.forEach((round, ri) => {
    const colX = PAD + ri * (CW + CONN);
    const P    = ptFor(ri);

    /* nome da rodada */
    ctx.save();
    ctx.font      = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.fillText(round.nome.toUpperCase(), colX + CW / 2, PAD + HDR - 10);
    ctx.restore();

    round.matches.forEach((match, mi) => {
      const Y   = PAD + HDR + P + mi * (CH + gapFor(ri));
      const mid = Y + CH / 2;

      const winA = !!match.winnerId && match.winnerId === match.teamA?.id;
      const winB = !!match.winnerId && match.winnerId === match.teamB?.id;

      /* sombra + fundo branco */
      ctx.save();
      ctx.shadowColor   = "rgba(0,0,0,0.08)";
      ctx.shadowBlur    = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle     = "#ffffff";
      rrect(ctx, colX, Y, CW, CH, 10);
      ctx.fill();
      ctx.restore();

      /* borda */
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth   = 1;
      rrect(ctx, colX, Y, CW, CH, 10);
      ctx.stroke();

      /* highlight do vencedor (clipa no card) */
      if (winA || winB) {
        ctx.save();
        rrect(ctx, colX, Y, CW, CH, 10);
        ctx.clip();
        ctx.fillStyle = "#ecfdf5";
        if (winA) ctx.fillRect(colX, Y, CW, CH / 2);
        if (winB) ctx.fillRect(colX, Y + CH / 2, CW, CH / 2);
        ctx.restore();
      }

      /* divisor central */
      ctx.strokeStyle = "#f3f4f6";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(colX + 1, mid);
      ctx.lineTo(colX + CW - 1, mid);
      ctx.stroke();

      /* placar */
      if (match.setsA !== null && match.setsB !== null) {
        ctx.save();
        ctx.font      = "bold 10px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.fillText(`${match.setsA} × ${match.setsB}`, colX + CW / 2, mid + 4);
        ctx.restore();
      }

      /* nome Dupla A */
      ctx.save();
      ctx.font      = `${winA ? "600" : "400"} 11.5px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = winA ? "#065f46" : (match.teamA ? "#111827" : "#9ca3af");
      ctx.textAlign = "left";
      ctx.fillText(
        fitText(ctx, match.teamA?.nome ?? "A definir", CW - 24),
        colX + 10, Y + CH / 4 + 4,
      );
      ctx.restore();

      /* nome Dupla B */
      ctx.save();
      ctx.font      = `${winB ? "600" : "400"} 11.5px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = winB ? "#065f46" : (match.teamB ? "#111827" : "#9ca3af");
      ctx.textAlign = "left";
      ctx.fillText(
        fitText(ctx, match.teamB?.nome ?? "A definir", CW - 24),
        colX + 10, Y + CH * 3 / 4 + 4,
      );
      ctx.restore();

      /* linhas conectoras */
      if (ri < nRounds - 1) {
        const nextMi  = Math.floor(mi / 2);
        const nextP   = ptFor(ri + 1);
        const nextY   = PAD + HDR + nextP + nextMi * (CH + gapFor(ri + 1));
        const nextMid = nextY + CH / 2;

        const sx = colX + CW;
        const mx = sx + CONN / 2;
        const ex = sx + CONN;

        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = "round";
        ctx.beginPath();

        /* stub horizontal deste confronto */
        ctx.moveTo(sx, mid);
        ctx.lineTo(mx, mid);

        /* barra vertical (apenas no par de cima, índice par) */
        if (mi % 2 === 0 && mi + 1 < round.matches.length) {
          const pairY   = PAD + HDR + P + (mi + 1) * (CH + gapFor(ri));
          const pairMid = pairY + CH / 2;
          ctx.moveTo(mx, mid);
          ctx.lineTo(mx, pairMid);
        }

        /* saída horizontal para o próximo confronto */
        ctx.moveTo(mx, nextMid);
        ctx.lineTo(ex, nextMid);

        ctx.stroke();
      }
    });
  });

  return { dataUrl: canvas.toDataURL("image/png"), logicalW, logicalH };
}
