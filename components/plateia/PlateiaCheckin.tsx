"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { checkinEspectador } from "@/app/painel/campeonatos/[id]/plateia/actions";

export type CheckinItem = {
  id: string;
  comprador_nome: string;
  tipo_nome: string | null;
  code: string | null;
  quantidade: number | null;
  checked_in: boolean;
};

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PlateiaCheckin({ champId, itens }: { champId: string; itens: CheckinItem[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const q = norm(busca.trim());
  const filtrados = q
    ? itens.filter((i) => norm(i.comprador_nome).includes(q) || (i.code ? norm(i.code).includes(q) : false))
    : itens;

  function toggle(id: string, presente: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await checkinEspectador(champId, id, presente);
      router.refresh();
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          {itens.length === 0 ? "Nenhum ingresso pago ainda." : "Nenhum resultado pra essa busca."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {filtrados.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{i.comprador_nome}</p>
                <p className="truncate text-xs text-gray-400">
                  {i.tipo_nome ?? "Plateia"}
                  {Number(i.quantidade) > 1 && ` · ${i.quantidade} ingressos`}
                  {i.code && ` · ${i.code}`}
                </p>
              </div>
              {i.checked_in ? (
                <button
                  type="button"
                  onClick={() => toggle(i.id, false)}
                  disabled={pendingId === i.id}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {pendingId === i.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Presente
                  <Undo2 className="size-3.5 opacity-60" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(i.id, true)}
                  disabled={pendingId === i.id}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pendingId === i.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Marcar presença
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
