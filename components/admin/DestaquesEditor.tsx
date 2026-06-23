"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star, X, Search, Check, Loader2, Trophy } from "lucide-react";
import { salvarDestaques } from "@/app/admin/destaques/actions";
import type { Championship } from "@/lib/types";

export function DestaquesEditor({
  campeonatos,
  initialDestaques,
}: {
  campeonatos: Championship[];
  initialDestaques: string[];
}) {
  // Descarta IDs de destaques que apontam pra campeonatos que não existem mais
  // (excluídos / viraram rascunho). Sem isso eles contavam pro limite de 3 e
  // travavam a seleção de novos, mesmo sem aparecer na lista.
  const [selecionados, setSelecionados] = useState<string[]>(() => {
    const idsValidos = new Set(campeonatos.map((c) => c.id));
    return initialDestaques.filter((id) => idsValidos.has(id)).slice(0, 3);
  });
  const [busca, setBusca] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtrados = campeonatos.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cidade.toLowerCase().includes(busca.toLowerCase()),
  );

  function toggle(id: string) {
    setSelecionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // já tem 3
      return [...prev, id];
    });
    setSaved(false);
  }

  function salvar() {
    setError("");
    startTransition(async () => {
      const res = await salvarDestaques(selecionados);
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(res.error ?? "Erro ao salvar.");
    });
  }

  const selecionadosData = selecionados
    .map((id) => campeonatos.find((c) => c.id === id))
    .filter(Boolean) as Championship[];

  return (
    <div className="space-y-6">

      {/* Selecionados */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Destaques selecionados ({selecionados.length}/3)
        </p>
        <div className="space-y-2 min-h-[56px]">
          {selecionadosData.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
              <Star className="size-4" /> Nenhum destaque selecionado
            </div>
          ) : (
            selecionadosData.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200"
              >
                <div className={`relative size-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${c.bannerFrom} ${c.bannerTo}`}>
                  {c.bannerUrl && <Image src={c.bannerUrl} alt={c.nome} fill className="object-cover" sizes="40px" />}
                  {!c.bannerUrl && <Trophy className="absolute inset-0 m-auto size-4 text-white/80" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    <span className="mr-2 text-amber-500">#{i + 1}</span>{c.nome}
                  </p>
                  <p className="text-xs text-gray-400">{c.cidade} · {c.estado}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botão salvar */}
      <button
        type="button"
        onClick={salvar}
        disabled={pending || selecionados.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Star className="size-4" />}
        {pending ? "Salvando…" : saved ? "Salvo!" : "Salvar destaques"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Lista de campeonatos */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Todos os campeonatos publicados
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade…"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filtrados.map((c) => {
            const sel = selecionados.includes(c.id);
            const pos = selecionados.indexOf(c.id);
            const bloqueado = !sel && selecionados.length >= 3;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => !bloqueado && toggle(c.id)}
                disabled={bloqueado}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ring-1 ${
                  sel
                    ? "bg-amber-50 ring-amber-300"
                    : bloqueado
                    ? "bg-gray-50 ring-gray-100 opacity-50 cursor-not-allowed"
                    : "bg-white ring-black/5 hover:bg-gray-50"
                }`}
              >
                <div className={`relative size-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${c.bannerFrom} ${c.bannerTo}`}>
                  {c.bannerUrl && <Image src={c.bannerUrl} alt={c.nome} fill className="object-cover" sizes="40px" />}
                  {!c.bannerUrl && <Trophy className="absolute inset-0 m-auto size-4 text-white/80" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.cidade} · {c.estado} · {c.status.replace("_", " ")}</p>
                </div>
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  sel ? "bg-amber-500 text-white" : "border-2 border-gray-200"
                }`}>
                  {sel ? pos + 1 : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
