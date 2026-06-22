"use client";

import { useState } from "react";
import { Share2, ImageDown, Check, Loader2 } from "lucide-react";

// Quebra texto em múltiplas linhas respeitando largura máxima no canvas.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Carrega a fonte Horizon do servidor uma única vez.
let horizonPromise: Promise<void> | null = null;
function carregarHorizon(): Promise<void> {
  if (!horizonPromise) {
    horizonPromise = (async () => {
      const font = new FontFace("Horizon", "url('/fonts/Horizon_Regular.otf')");
      await font.load();
      document.fonts.add(font);
    })();
  }
  return horizonPromise;
}

// Gera a imagem 1080x1920 (story do Instagram) e dispara o download.
//
// Zonas seguras do Instagram Stories:
//   - Topo: ~270px (foto de perfil + nome + botão fechar)
//   - Base: ~340px (barra "Enviar mensagem" + área de arrastar)
//   Conteúdo em texto deve ficar entre ~270 e ~1580.
type Tamanho = "P" | "M" | "G";

const TAMANHOS: Record<Tamanho, { titulo: number; lineT: number }> = {
  P: { titulo: 56, lineT: 72  },
  M: { titulo: 68, lineT: 88  },
  G: { titulo: 80, lineT: 102 },
};

async function gerarStoryPNG(
  titulo: string,
  imagemUrl: string | null,
  tamanho: Tamanho = "M",
): Promise<void> {
  await carregarHorizon();
  const tam = TAMANHOS[tamanho];
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1. Fundo: imagem da notícia (cover) ou gradiente azul
  if (imagemUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("cors"));
      img.src = imagemUrl;
    });
    const scale = Math.max(W / img.width, H / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1e3a8a");
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Overlay escuro em degradê: mais forte no topo e na base
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0,    "rgba(0,0,0,0.55)"); // topo — onde fica o perfil do Insta
  overlay.addColorStop(0.18, "rgba(0,0,0,0.20)");
  overlay.addColorStop(0.45, "rgba(0,0,0,0.05)");
  overlay.addColorStop(0.60, "rgba(0,0,0,0.35)");
  overlay.addColorStop(1,    "rgba(0,0,0,0.85)"); // base — onde fica a barra do Insta
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  const SIDE = 90; // margem lateral do texto

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // 3. Logo RankFTV — abaixo da zona de topo (270px), discreta
  ctx.font = "40px Horizon";
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText("RankFTV", W / 2, 360);

  // 4. Título — centralizado verticalmente na zona segura (270–1580)
  ctx.font = `${tam.titulo}px Horizon`;
  ctx.fillStyle = "#ffffff";
  const tLines = wrapText(ctx, titulo, W - SIDE * 2);
  const totalH = tLines.length * tam.lineT;
  let y = Math.round((270 + 1580) / 2 - totalH / 2) + tam.titulo;
  for (const line of tLines.slice(0, 5)) {
    ctx.fillText(line, W / 2, y);
    y += tam.lineT;
  }

  // 6. Download
  const a = document.createElement("a");
  a.download = "rankftv-story.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

type Props = {
  titulo: string;
  tituloStory: string | null;
  tamanhoFonte: Tamanho;
  imagemUrl: string | null;
};

export function BotoesNoticia({ titulo, tituloStory, tamanhoFonte, imagemUrl }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  async function compartilhar() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        // usuário cancelou ou não suportado — cai no clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  async function gerarStory() {
    setGerando(true);
    setErro(false);
    const tituloFinal = tituloStory?.trim() || titulo;
    try {
      await gerarStoryPNG(tituloFinal, imagemUrl, tamanhoFonte);
    } catch {
      try {
        await gerarStoryPNG(tituloFinal, null, tamanhoFonte);
      } catch {
        setErro(true);
      }
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-2 mt-5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={compartilhar}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copiado
            ? <Check className="size-4 text-emerald-500" />
            : <Share2 className="size-4" />}
          {copiado ? "Link copiado!" : "Compartilhar link"}
        </button>

        <button
          type="button"
          onClick={gerarStory}
          disabled={gerando}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {gerando
            ? <Loader2 className="size-4 animate-spin" />
            : <ImageDown className="size-4" />}
          {gerando ? "Gerando…" : "Story do Insta"}
        </button>
      </div>

      {erro && (
        <p className="text-center text-xs text-red-500">
          Não foi possível gerar a imagem. Tente novamente.
        </p>
      )}
    </div>
  );
}
