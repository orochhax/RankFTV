"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Info } from "lucide-react";

type Props = {
  championshipId: string;
  tituloInicial: string;
  marcaInicial: string;
};

// Gera a query string do card e mostra preview ao vivo + download do PNG transparente.
export function CardResultadoGenerator({ tituloInicial, marcaInicial }: Props) {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [campea, setCampea] = useState("");
  const [vice, setVice] = useState("");
  const [marca, setMarca] = useState(marcaInicial);
  const [s1c, setS1c] = useState("");
  const [s1v, setS1v] = useState("");
  const [s2c, setS2c] = useState("");
  const [s2v, setS2v] = useState("");
  const [s3c, setS3c] = useState("");
  const [s3v, setS3v] = useState("");
  const [fundoSolido, setFundoSolido] = useState(false);
  const [baixando, setBaixando] = useState(false);

  // Monta "18-16,18-15,15-12" só com os sets preenchidos (até 3 sets)
  const sets = useMemo(() => {
    const pares: string[] = [];
    if (s1c || s1v) pares.push(`${s1c || 0}-${s1v || 0}`);
    if (s2c || s2v) pares.push(`${s2c || 0}-${s2v || 0}`);
    if (s3c || s3v) pares.push(`${s3c || 0}-${s3v || 0}`);
    return pares.join(",");
  }, [s1c, s1v, s2c, s2v, s3c, s3v]);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (titulo) p.set("titulo", titulo);
    if (campea) p.set("campea", campea);
    if (vice) p.set("vice", vice);
    if (sets) p.set("sets", sets);
    p.set("marca", marca);
    if (fundoSolido) p.set("fundo", "solido");
    return `/api/card-resultado?${p.toString()}`;
  }, [titulo, campea, vice, sets, marca, fundoSolido]);

  async function baixar() {
    setBaixando(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `card-${(campea || "resultado").toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setBaixando(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const numInput =
    "w-full rounded-lg border border-gray-200 px-2 py-2 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Formulário ── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título (campeonato + local)</label>
          <input className={`mt-1 ${input}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: TAFC 54 - Bahia - Porto Seguro" />
        </div>

        {/* Dupla campeã — nome em linha cheia, depois os 3 sets */}
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dupla campeã 🏆</label>
            <input className={`mt-1 ${input}`} value={campea} onChange={(e) => setCampea(e.target.value)} placeholder="Carlos e Gustavo" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-center text-xs font-medium text-gray-500">Set 1</label>
              <input className={`mt-1 ${numInput}`} value={s1c} onChange={(e) => setS1c(e.target.value)} placeholder="18" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-center text-xs font-medium text-gray-500">Set 2</label>
              <input className={`mt-1 ${numInput}`} value={s2c} onChange={(e) => setS2c(e.target.value)} placeholder="18" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-center text-xs font-medium text-gray-500">Set 3</label>
              <input className={`mt-1 ${numInput}`} value={s3c} onChange={(e) => setS3c(e.target.value)} placeholder="" inputMode="numeric" />
            </div>
          </div>
        </div>

        {/* Dupla vice — nome em linha cheia, depois os 3 sets */}
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dupla vice</label>
            <input className={`mt-1 ${input}`} value={vice} onChange={(e) => setVice(e.target.value)} placeholder="Maicon e Lucas" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className={numInput} value={s1v} onChange={(e) => setS1v(e.target.value)} placeholder="16" inputMode="numeric" />
            <input className={numInput} value={s2v} onChange={(e) => setS2v(e.target.value)} placeholder="15" inputMode="numeric" />
            <input className={numInput} value={s3v} onChange={(e) => setS3v(e.target.value)} placeholder="" inputMode="numeric" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Marca / circuito (rodapé esquerdo)</label>
          <input className={`mt-1 ${input}`} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="TAFC" />
        </div>

        {/* Toggle de fundo */}
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
          <span className="flex-1 text-sm font-medium text-gray-700">Fundo</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFundoSolido(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                !fundoSolido
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Transparente
            </button>
            <button
              onClick={() => setFundoSolido(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                fundoSolido
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
              }`}
            >
              Preto
            </button>
          </div>
        </div>

        <button
          onClick={baixar}
          disabled={baixando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {baixando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Baixar card (PNG transparente)
        </button>

        <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 ring-1 ring-blue-100">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            O card é <strong>transparente no meio</strong>. Baixe e coloque por cima da sua foto
            no story do Instagram — os dados ficam na frente.
          </span>
        </div>
      </div>

      {/* ── Preview (sobre fundo escuro pra simular a foto) ── */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-full max-w-[280px] overflow-hidden rounded-2xl ring-1 ring-black/10"
          style={{ aspectRatio: "1080 / 1920", background: "linear-gradient(135deg,#374151,#9ca3af)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Prévia do card" className="h-full w-full object-contain" />
        </div>
        <p className="text-center text-xs text-gray-400">
          Fundo cinza só pra visualizar — no PNG ele é transparente.
        </p>
      </div>
    </div>
  );
}
