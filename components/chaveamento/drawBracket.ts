import type { RoundDisplay, MatchDisplay } from "@/app/painel/campeonatos/[id]/chaveamento/page";
import { createBracketExportScene, bracketRasterScale, type ExportOptions, type ExportScene } from "@/lib/bracket-export";

export function drawBracket(rounds: RoundDisplay[], third?: MatchDisplay | null, options: ExportOptions = {}) {
  const scene = createBracketExportScene(rounds, third, options);
  const scale = bracketRasterScale(scene);
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(scene.width * scale);
  canvas.height = Math.floor(scene.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar a imagem. Tente exportar em PDF.");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f3f5fa";
  ctx.fillRect(0, 0, scene.width, scene.height);
  for (const shape of scene.shapes) {
    ctx.fillStyle = shape.fill;
    if (shape.kind === "text") {
      ctx.font = `${shape.bold ? "600" : "400"} ${shape.size}px Arial, sans-serif`;
      ctx.fillText(shape.value, shape.x, shape.y);
    } else if (shape.kind === "rect") {
      ctx.beginPath();
      ctx.roundRect(shape.x, shape.y, shape.w, shape.h, shape.radius);
      ctx.fill();
      if (shape.stroke) { ctx.strokeStyle = shape.stroke; ctx.lineWidth = 1; ctx.stroke(); }
    } else {
      ctx.strokeStyle = shape.fill; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x2, shape.y2); ctx.stroke();
    }
  }
  const dataUrl = canvas.toDataURL("image/png");
  if (dataUrl === "data:,") throw new Error("Imagem excedeu o limite do navegador. Exporte em PDF.");
  return { dataUrl, logicalW: scene.width, logicalH: scene.height };
}

export async function createBracketPdf(scene: ExportScene) {
  const { jsPDF } = await import("jspdf");
  // PDF has a 14,400-point page limit. Scale coordinates, keeping text/vector
  // data intact and all matches inside the MediaBox, even for 256 pairs.
  const scale = Math.min(1, 12000 / Math.max(scene.width, scene.height));
  const w = scene.width * scale, h = scene.height * scale;
  const pdf = new jsPDF({ unit: "pt", format: [w, h], orientation: w > h ? "landscape" : "portrait", compress: true });
  pdf.setFillColor("#f3f5fa"); pdf.rect(0, 0, w, h, "F");
  for (const s of scene.shapes) {
    if (s.kind === "text") {
      pdf.setFont("helvetica", s.bold ? "bold" : "normal");
      pdf.setFontSize(s.size * scale); pdf.setTextColor(s.fill);
      pdf.text(s.value, s.x * scale, s.y * scale);
    } else if (s.kind === "rect") {
      pdf.setFillColor(s.fill); pdf.setLineWidth(scale);
      if (s.stroke) pdf.setDrawColor(s.stroke);
      pdf.roundedRect(s.x * scale, s.y * scale, s.w * scale, s.h * scale, s.radius * scale, s.radius * scale, s.stroke ? "FD" : "F");
    } else {
      pdf.setDrawColor(s.fill); pdf.setLineWidth(1.5 * scale);
      pdf.line(s.x * scale, s.y * scale, s.x2 * scale, s.y2 * scale);
    }
  }
  return pdf;
}
