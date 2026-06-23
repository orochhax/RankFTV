"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Shirt } from "lucide-react";
import { confirmarTamanhoCamisa } from "@/app/minhas-inscricoes/actions";

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"];

export function TamanhoCamisaPicker({ champId }: { champId: string }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirmar() {
    if (!selecionado) return;
    setErro(null);
    start(async () => {
      const res = await confirmarTamanhoCamisa(champId, selecionado);
      if (!res.ok) setErro(res.error ?? "Erro ao salvar tamanho.");
    });
  }

  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 space-y-3">
      <div className="flex items-center gap-2">
        <Shirt className="size-4 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">Escolha o tamanho do seu uniforme</p>
      </div>
      <p className="text-xs text-amber-700">
        Necessário para a produção do kit. Após confirmar, não é possível alterar por aqui.
      </p>

      <div className="grid grid-cols-6 gap-1.5">
        {TAMANHOS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelecionado(t)}
            className={`flex items-center justify-center rounded-lg border py-2 text-xs font-medium transition-colors ${
              selecionado === t
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-amber-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={!selecionado || pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {pending ? "Salvando…" : "Confirmar tamanho"}
      </button>
    </div>
  );
}
