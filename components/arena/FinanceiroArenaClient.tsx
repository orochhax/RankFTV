"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2, Clock, DollarSign, Send } from "lucide-react";
import { emitirMensalidade, definirValorMensalidade } from "@/app/arena/financeiro/actions";

type Aluno = {
  id: string;
  nome: string;
  username: string;
  valorMensalidade: number | null;
  cobranca: { id: string; status: string; competencia: string } | null;
};

export function FinanceiroArenaClient({
  alunos,
  mesAtual,
}: {
  alunos: Aluno[];
  mesAtual: string;
}) {
  const [editandoValor, setEditandoValor] = useState<string | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [pending, startTransition] = useTransition();
  const [msgs, setMsgs] = useState<Record<string, string>>({});

  function setMsg(id: string, msg: string) {
    setMsgs((prev) => ({ ...prev, [id]: msg }));
    setTimeout(() => setMsgs((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3500);
  }

  function emitir(alunoId: string) {
    startTransition(async () => {
      const r = await emitirMensalidade(alunoId, mesAtual);
      if (r.error) setMsg(alunoId, r.error);
      else setMsg(alunoId, "Cobrança enviada!");
    });
  }

  function salvarValor(alunoId: string) {
    const v = parseFloat(novoValor.replace(",", "."));
    if (isNaN(v) || v <= 0) { setMsg(alunoId, "Valor inválido."); return; }
    startTransition(async () => {
      const r = await definirValorMensalidade(alunoId, v);
      if (r.error) setMsg(alunoId, r.error);
      else { setEditandoValor(null); setNovoValor(""); }
    });
  }

  if (alunos.length === 0) {
    return (
      <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
        Nenhum aluno ativo.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {alunos.map((a) => {
        const pago   = a.cobranca?.status === "pago";
        const pend   = a.cobranca?.status === "pendente";
        const semCob = !a.cobranca;

        return (
          <li
            key={a.id}
            className="rounded-2xl bg-white p-4 ring-1 ring-black/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.nome}</p>
                <p className="text-xs text-gray-400">@{a.username}</p>
              </div>

              {/* Status da mensalidade */}
              {pago && (
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> Pago
                </div>
              )}
              {pend && (
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Clock className="size-3.5" /> Pendente
                </div>
              )}
              {semCob && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <DollarSign className="size-3.5" /> Sem cobrança
                </div>
              )}
            </div>

            {/* Valor da mensalidade */}
            <div className="mt-3 flex items-center gap-2">
              {editandoValor === a.id ? (
                <>
                  <input
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                  <button
                    onClick={() => salvarValor(a.id)}
                    disabled={pending}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="size-3 animate-spin" /> : "Salvar"}
                  </button>
                  <button
                    onClick={() => setEditandoValor(null)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-600">
                    {a.valorMensalidade
                      ? `R$ ${a.valorMensalidade.toFixed(2).replace(".", ",")}/mês`
                      : "Sem valor definido"}
                  </span>
                  <button
                    onClick={() => { setEditandoValor(a.id); setNovoValor(a.valorMensalidade?.toFixed(2) ?? ""); }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>

            {/* Ação de cobrar */}
            {semCob && a.valorMensalidade && (
              <button
                onClick={() => emitir(a.id)}
                disabled={pending}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                Cobrar mensalidade de {mesAtual.slice(5)}/{mesAtual.slice(0,4)}
              </button>
            )}

            {msgs[a.id] && (
              <p className="mt-2 text-xs text-gray-500">{msgs[a.id]}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
