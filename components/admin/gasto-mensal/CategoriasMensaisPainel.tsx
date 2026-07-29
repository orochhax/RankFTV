"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { criarCategoriaMensal, renomearCategoriaMensal, removerCategoriaMensal } from "@/app/admin/gasto-mensal/actions";
import type { MonthlyBudgetCategory } from "@/lib/monthly-budget";

export function CategoriasMensaisPainel({ categories, onClose }: { categories: MonthlyBudgetCategory[]; onClose: () => void }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Não foi possível salvar."); return; }
      setNewName(""); setEditing(null); router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2"><Tags className="size-5 text-blue-600" /><h2 className="text-lg font-bold text-gray-900">Categorias</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Fechar"><X className="size-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); run(() => criarCategoriaMensal(newName)); }} className="mb-5 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova categoria" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <button type="submit" disabled={pending || !newName.trim()} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="size-4" />Adicionar</button>
        </form>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {categories.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhuma categoria criada.</p>}
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 px-3 py-2.5">
              {editing === category.id ? (
                <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              ) : <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{category.name}</span>}
              {editing === category.id ? (
                <button type="button" onClick={() => run(() => renomearCategoriaMensal(category.id, editingName))} disabled={pending} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Salvar"><Check className="size-4" /></button>
              ) : <button type="button" onClick={() => { setEditing(category.id); setEditingName(category.name); }} className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Renomear"><Pencil className="size-4" /></button>}
              <button type="button" onClick={() => { if (window.confirm(`Remover a categoria "${category.name}"? Os lançamentos continuarão salvos e ficarão sem categoria.`)) run(() => removerCategoriaMensal(category.id)); }} disabled={pending} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Remover"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        {pending && <p className="mt-3 flex items-center gap-2 text-xs text-gray-400"><Loader2 className="size-3 animate-spin" />Salvando...</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-gray-400">Remover uma categoria nunca apaga seus lançamentos.</p>
      </div>
    </div>
  );
}
