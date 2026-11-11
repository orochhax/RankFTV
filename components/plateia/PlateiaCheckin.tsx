"use client";

import { useState, useTransition, type FormEvent } from "react";
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

export function PlateiaCheckin({
  champId,
  itens,
  initialSearch = "",
}: {
  champId: string;
  itens: CheckinItem[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(initialSearch);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtrados = itens;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = busca.trim();
    router.push(`/painel/campeonatos/${champId}/checkin?tab=plateia${query ? `&q=${encodeURIComponent(query)}` : ""}`);
  }

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
      <form onSubmit={submitSearch} className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="w-full rounded-xl border border-border py-2.5 pl-9 pr-11 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button type="submit" title="Buscar" className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
          <Search className="size-4" />
        </button>
      </form>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          {initialSearch ? "Nenhum resultado pra essa busca." : "Nenhum ingresso pago ainda."}
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
                  className="flex items-center gap-1.5 rounded-lg bg-success-bg px-3 py-2 text-sm font-medium text-success ring-1 ring-success/25 hover:bg-success-bg/80 disabled:opacity-60"
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
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
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
