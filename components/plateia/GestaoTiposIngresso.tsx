"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import {
  criarTipoIngresso,
  alternarTipoIngresso,
  excluirTipoIngresso,
} from "@/app/painel/campeonatos/[id]/plateia/actions";
import { formatBRL } from "@/lib/format";

type Tipo = { id: string; nome: string; valor: number; ativo: boolean };

export function GestaoTiposIngresso({
  champId,
  tipos,
}: {
  champId: string;
  tipos: Tipo[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function adicionar() {
    setErro(null);
    if (!nome.trim()) { setErro("Dê um nome ao ingresso."); return; }
    startTransition(async () => {
      const res = await criarTipoIngresso(champId, nome, Number(valor) || 0);
      if (res.ok) { setNome(""); setValor(""); router.refresh(); }
      else setErro(res.error ?? "Erro ao criar.");
    });
  }

  function alternar(tipoId: string, ativo: boolean) {
    startTransition(async () => {
      await alternarTipoIngresso(champId, tipoId, ativo);
      router.refresh();
    });
  }

  function excluir(tipoId: string) {
    if (!confirm("Excluir este tipo de ingresso? Ingressos já vendidos não são afetados.")) return;
    startTransition(async () => {
      await excluirTipoIngresso(champId, tipoId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Lista */}
      {tipos.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${t.ativo ? "text-gray-900" : "text-gray-400 line-through"}`}>{t.nome}</p>
                <p className="text-xs text-gray-400">{Number(t.valor) === 0 ? "Grátis" : formatBRL(Number(t.valor))}</p>
              </div>
              <button
                type="button"
                onClick={() => alternar(t.id, !t.ativo)}
                disabled={pending}
                title={t.ativo ? "Desativar (some da venda)" : "Ativar"}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                {t.ativo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => excluir(t.id)}
                disabled={pending}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Adicionar */}
      <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
        <p className="mb-2 text-sm font-medium text-gray-700">Novo tipo de ingresso</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Inteira, Meia, VIP..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-500">Valor (R$)</label>
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={adicionar}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Adicionar
          </button>
        </div>
        {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
        <p className="mt-2 text-xs text-gray-400">Valor 0 = ingresso grátis. Desative um tipo pra tirar da venda sem excluir.</p>
      </div>
    </div>
  );
}
