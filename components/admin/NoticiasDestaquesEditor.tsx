"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star, Check, Loader2, Newspaper } from "lucide-react";
import { salvarNoticiasDestaques } from "@/app/admin/noticias/actions";
import { type News, formatDataNoticia } from "@/lib/news-utils";

// Editor dos destaques da home: escolhe e ordena até 3 notícias. A ordem de
// seleção (#1, #2, #3) é a ordem do carrossel. Se nada for salvo, a home cai
// no fallback (3 mais recentes).
export function NoticiasDestaquesEditor({
  noticias,
  initialDestaques,
}: {
  noticias: News[];
  initialDestaques: string[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>(initialDestaques.slice(0, 3));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
      const res = await salvarNoticiasDestaques(selecionados);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Destaques da home</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Escolha até 3 notícias e a ordem do carrossel (1, 2, 3). Sem seleção, a home mostra
          as 3 mais recentes.
        </p>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Star className="size-4" />}
        {pending ? "Salvando…" : saved ? "Salvo!" : `Salvar destaques (${selecionados.length}/3)`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {noticias.map((n) => {
          const sel = selecionados.includes(n.id);
          const pos = selecionados.indexOf(n.id);
          const bloqueado = !sel && selecionados.length >= 3;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => !bloqueado && toggle(n.id)}
                disabled={bloqueado}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ring-1 ${
                  sel
                    ? "bg-amber-50 ring-amber-300"
                    : bloqueado
                    ? "bg-gray-50 ring-gray-100 opacity-50 cursor-not-allowed"
                    : "bg-white ring-black/5 hover:bg-gray-50"
                }`}
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {n.imagem_url ? (
                    <Image src={n.imagem_url} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Newspaper className="size-4 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{n.titulo}</p>
                  <p className="truncate text-xs text-gray-400">{formatDataNoticia(n.created_at)}</p>
                </div>
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  sel ? "bg-amber-500 text-white" : "border-2 border-gray-200 text-transparent"
                }`}>
                  {sel ? pos + 1 : ""}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
