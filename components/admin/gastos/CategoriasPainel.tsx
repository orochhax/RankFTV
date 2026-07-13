"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Tags, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { criarCategoria, renomearCategoria, removerCategoria } from "@/app/admin/gastos/actions";
import { SEM_CATEGORIA, type PersonalFinanceCategory } from "@/lib/personal-finance";

export function CategoriasPainel({
  categories,
  onClose,
}: {
  categories: PersonalFinanceCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    setCriando(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", nome);
      const res = await criarCategoria(fd);
      setCriando(false);
      if (!res.ok) { setErro(res.error ?? "Erro ao criar categoria."); return; }
      setNovoNome("");
      router.refresh();
    });
  }

  function handleRenomear(id: string) {
    const nome = editandoNome.trim();
    if (!nome) return;
    setErro(null);
    setPendingId(id);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("name", nome);
      const res = await renomearCategoria(fd);
      setPendingId(null);
      if (!res.ok) { setErro(res.error ?? "Erro ao renomear categoria."); return; }
      setEditandoId(null);
      router.refresh();
    });
  }

  function handleRemover(cat: PersonalFinanceCategory) {
    if (!confirm(`Remover a categoria "${cat.name}"? Os lançamentos não serão apagados; eles serão movidos para ${SEM_CATEGORIA}.`)) return;
    setErro(null);
    setPendingId(cat.id);
    startTransition(async () => {
      const res = await removerCategoria(cat.id);
      setPendingId(null);
      if (!res.ok) { setErro(res.error ?? "Erro ao remover categoria."); return; }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="size-5 text-blue-600" />
            <p className="text-lg font-semibold text-gray-900">Categorias</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        {/* Adicionar nova */}
        <div className="mb-4 flex gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
            placeholder="Nova categoria"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCriar}
            disabled={criando || !novoNome.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {criando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
        </div>

        {erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

        {/* Lista */}
        <ul className="space-y-1.5">
          {categories.map((cat) => {
            const fixa = cat.name === SEM_CATEGORIA;
            const editando = editandoId === cat.id;
            const pending = pendingId === cat.id;
            return (
              <li key={cat.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                {editando ? (
                  <>
                    <input
                      value={editandoNome}
                      onChange={(e) => setEditandoNome(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenomear(cat.id)}
                      autoFocus
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenomear(cat.id)}
                      disabled={pending}
                      className="shrink-0 rounded-lg p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
                      title="Salvar"
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoId(null)}
                      disabled={pending}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                      title="Cancelar"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-gray-800">{cat.name}</span>
                    {!fixa && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditandoId(cat.id); setEditandoNome(cat.name); setErro(null); }}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Renomear"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemover(cat)}
                          disabled={pending}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Remover"
                        >
                          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
