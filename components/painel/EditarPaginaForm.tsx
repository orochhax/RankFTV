"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { atualizarPagina } from "@/app/painel/paginas/[id]/editar/actions";

export function EditarPaginaForm({
  pageId,
  initialNome,
  initialDescricao,
}: {
  pageId: string;
  initialNome: string;
  initialDescricao: string;
}) {
  const [nome, setNome] = useState(initialNome);
  const [descricao, setDescricao] = useState(initialDescricao);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!nome.trim()) { setError("O nome é obrigatório."); return; }
    setError("");
    startTransition(async () => {
      const res = await atualizarPagina(pageId, nome, descricao);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">Nome da página</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">Descrição</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={160}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-right text-xs text-gray-400">{descricao.length}/160</p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="size-3.5" /> Salvo
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="ml-auto rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
