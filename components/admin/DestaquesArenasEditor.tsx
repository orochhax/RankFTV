"use client";

import { useState, useTransition } from "react";
import { Star, X, Search, Check, Loader2, Building2, MapPin, Users } from "lucide-react";
import { salvarDestaquesArenas } from "@/app/admin/destaques/actions";
import type { ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";

export function DestaquesArenasEditor({
  arenas,
  initialDestaques,
}: {
  arenas: ArenaDestaque[];
  initialDestaques: string[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>(() => {
    const idsValidos = new Set(arenas.map((a) => a.id));
    return initialDestaques.filter((id) => idsValidos.has(id)).slice(0, 3);
  });
  const [busca, setBusca] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtrados = arenas.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.cidade.toLowerCase().includes(busca.toLowerCase()),
  );

  function toggle(id: string) {
    setSelecionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setSaved(false);
  }

  function salvar() {
    setError("");
    startTransition(async () => {
      const res = await salvarDestaquesArenas(selecionados);
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(res.error ?? "Erro ao salvar.");
    });
  }

  const selecionadosData = selecionados
    .map((id) => arenas.find((a) => a.id === id))
    .filter(Boolean) as ArenaDestaque[];

  return (
    <div className="space-y-6">

      {/* Selecionados */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Destaques selecionados ({selecionados.length}/3)
        </p>
        <div className="min-h-[56px] space-y-2">
          {selecionadosData.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
              <Star className="size-4" /> Nenhuma arena selecionada
            </div>
          ) : (
            selecionadosData.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200"
              >
                <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-700 to-blue-900">
                  {a.banner_url
                    ? <img src={a.banner_url} alt={a.nome} className="size-10 object-cover" /> // eslint-disable-line @next/next/no-img-element
                    : <Building2 className="size-4 text-white/60" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    <span className="mr-2 text-blue-500">#{i + 1}</span>{a.nome}
                  </p>
                  <p className="text-xs text-gray-400">{a.cidade} · {a.estado}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Star className="size-4" />}
        {pending ? "Salvando…" : saved ? "Salvo!" : "Salvar destaques de arenas"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Lista de arenas */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Todas as arenas
        </p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade…"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filtrados.map((a) => {
            const sel = selecionados.includes(a.id);
            const pos = selecionados.indexOf(a.id);
            const bloqueado = !sel && selecionados.length >= 3;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => !bloqueado && toggle(a.id)}
                disabled={bloqueado}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition-colors ${
                  sel
                    ? "bg-blue-50 ring-blue-300"
                    : bloqueado
                    ? "cursor-not-allowed bg-gray-50 opacity-50 ring-gray-100"
                    : "bg-white ring-black/5 hover:bg-gray-50"
                }`}
              >
                <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-700 to-blue-900">
                  {a.banner_url
                    ? <img src={a.banner_url} alt={a.nome} className="size-10 object-cover" /> // eslint-disable-line @next/next/no-img-element
                    : <Building2 className="size-4 text-white/60" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{a.nome}</p>
                  <p className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5"><MapPin className="size-3" />{a.cidade} · {a.estado}</span>
                    <span className="flex items-center gap-0.5"><Users className="size-3" />{a.alunos} alunos</span>
                  </p>
                </div>
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  sel ? "bg-blue-600 text-white" : "border-2 border-gray-200"
                }`}>
                  {sel ? pos + 1 : ""}
                </div>
              </button>
            );
          })}
          {filtrados.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">Nenhuma arena encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
