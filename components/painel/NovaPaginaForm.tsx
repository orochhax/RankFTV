"use client";

import { useActionState, useState } from "react";
import { criarPagina } from "@/app/painel/paginas/nova/actions";

const GRADIENT_OPTIONS = [
  { from: "from-blue-500",    to: "to-cyan-400",   label: "Azul" },
  { from: "from-emerald-500", to: "to-teal-400",   label: "Verde" },
  { from: "from-orange-500",  to: "to-amber-400",  label: "Laranja" },
  { from: "from-violet-500",  to: "to-purple-400", label: "Roxo" },
  { from: "from-rose-500",    to: "to-pink-400",   label: "Rosa" },
  { from: "from-indigo-500",  to: "to-blue-400",   label: "Índigo" },
  { from: "from-slate-600",   to: "to-slate-400",  label: "Cinza" },
] as const;

const INITIAL_STATE: { error?: string } = {};

export function NovaPaginaForm() {
  const [state, action, pending] = useActionState(criarPagina, INITIAL_STATE);
  const [selectedGradient, setSelectedGradient] = useState(0);
  const [handle, setHandle] = useState("");
  const [nome, setNome] = useState("");

  const gradient = GRADIENT_OPTIONS[selectedGradient];

  // Gera handle sugerido a partir do nome
  function handleNomeChange(value: string) {
    setNome(value);
    if (handle === "") {
      const suggestion = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setHandle(suggestion);
    }
  }

  return (
    <form action={action} className="space-y-6">
      {/* Preview do banner */}
      <div
        className={`flex h-24 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${gradient.from} ${gradient.to} transition-all`}
      >
        <span className="text-4xl font-bold text-white/90">
          {nome ? nome.charAt(0).toUpperCase() : "?"}
        </span>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
          Nome da página
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          value={nome}
          onChange={(e) => handleNomeChange(e.target.value)}
          placeholder="Ex: Copa Litoral FTV"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Handle */}
      <div className="space-y-1.5">
        <label htmlFor="handle" className="block text-sm font-medium text-gray-700">
          @handle
        </label>
        <div className="flex items-center gap-0 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <span className="select-none px-3 py-3 text-sm text-gray-400">@</span>
          <input
            id="handle"
            name="handle"
            type="text"
            required
            value={handle}
            onChange={(e) =>
              setHandle(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 30),
              )
            }
            placeholder="copa-litoral"
            className="min-w-0 flex-1 rounded-xl bg-transparent py-3 pr-4 text-sm outline-none"
          />
        </div>
        <p className="text-xs text-gray-400">
          Letras minúsculas, números e hífens · aparece na URL da página
        </p>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          placeholder="Uma frase sobre o campeonato — aparece na lista de páginas."
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Cor do banner */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Cor do banner</p>
        <div className="flex flex-wrap gap-2">
          {GRADIENT_OPTIONS.map((g, i) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setSelectedGradient(i)}
              className={`h-8 w-8 rounded-full bg-gradient-to-br ${g.from} ${g.to} ring-2 ring-offset-2 transition-all ${
                i === selectedGradient ? "ring-blue-600" : "ring-transparent"
              }`}
              title={g.label}
            />
          ))}
        </div>
        <input type="hidden" name="bannerFrom" value={gradient.from} />
        <input type="hidden" name="bannerTo" value={gradient.to} />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Criando página…" : "Criar página"}
      </button>
    </form>
  );
}
