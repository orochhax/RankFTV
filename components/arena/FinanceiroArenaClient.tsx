"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, CheckCircle2, Clock, DollarSign, Send, Search, X } from "lucide-react";
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
  const [busca, setBusca] = useState("");
  const [apenasNaoPagos, setApenasNaoPagos] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const [editandoValor, setEditandoValor] = useState<string | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [pending, startTransition] = useTransition();
  const [cobrandoTodos, setCobrandoTodos] = useState(false);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [msgGeral, setMsgGeral] = useState<string | null>(null);

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

  // Filtro: busca por nome/@usuário + "somente quem ainda não pagou"
  const filtrados = useMemo(() => {
    let list = alunos;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter(
        (a) => a.nome.toLowerCase().includes(q) || a.username.toLowerCase().includes(q),
      );
    }
    if (apenasNaoPagos) {
      list = list.filter((a) => a.cobranca?.status !== "pago");
    }
    return list;
  }, [alunos, busca, apenasNaoPagos]);

  // Só entra na seleção quem pode ser cobrado agora (sem cobrança e com valor definido)
  const cobravel = (a: Aluno) => !a.cobranca && !!a.valorMensalidade;
  const elegiveisFiltrados = filtrados.filter(cobravel);
  const todosSelecionados =
    elegiveisFiltrados.length > 0 && elegiveisFiltrados.every((a) => selecionados.has(a.id));

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelecionarTodos() {
    setSelecionados((prev) => {
      if (todosSelecionados) {
        const next = new Set(prev);
        for (const a of elegiveisFiltrados) next.delete(a.id);
        return next;
      }
      const next = new Set(prev);
      for (const a of elegiveisFiltrados) next.add(a.id);
      return next;
    });
  }

  function cobrarSelecionados() {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    setCobrandoTodos(true);
    setMsgGeral(null);
    startTransition(async () => {
      let ok = 0;
      let falhas = 0;
      for (const id of ids) {
        const r = await emitirMensalidade(id, mesAtual);
        if (r.error) { falhas++; setMsg(id, r.error); }
        else ok++;
      }
      setMsgGeral(
        falhas === 0
          ? `${ok} cobrança${ok > 1 ? "s" : ""} enviada${ok > 1 ? "s" : ""}!`
          : `${ok} enviada${ok > 1 ? "s" : ""}, ${falhas} com erro.`,
      );
      setSelecionados(new Set());
      setCobrandoTodos(false);
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
    <div className="space-y-3">
      {/* Busca + filtro */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno pelo nome…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setApenasNaoPagos((v) => !v)}
          className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
            apenasNaoPagos
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Só quem não pagou
        </button>
      </div>

      {/* Seleção em massa */}
      {elegiveisFiltrados.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-black/5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={todosSelecionados}
              onChange={toggleSelecionarTodos}
              className="size-4 rounded border-gray-300 accent-blue-600"
            />
            {selecionados.size > 0
              ? `${selecionados.size} selecionado${selecionados.size > 1 ? "s" : ""}`
              : "Selecionar todos"}
          </label>
          <button
            onClick={cobrarSelecionados}
            disabled={selecionados.size === 0 || pending}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cobrandoTodos ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Cobrar selecionados
          </button>
        </div>
      )}
      {msgGeral && <p className="text-xs text-gray-500">{msgGeral}</p>}

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum aluno encontrado.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => {
            const pago   = a.cobranca?.status === "pago";
            const pend   = a.cobranca?.status === "pendente";
            const semCob = !a.cobranca;
            const podeSelecionar = cobravel(a);

            return (
              <li
                key={a.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-black/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {podeSelecionar && (
                      <input
                        type="checkbox"
                        checked={selecionados.has(a.id)}
                        onChange={() => toggleSelecionado(a.id)}
                        className="mt-1 size-4 shrink-0 rounded border-gray-300 accent-blue-600"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{a.nome}</p>
                      <p className="text-xs text-gray-400">@{a.username}</p>
                    </div>
                  </div>

                  {/* Status da mensalidade */}
                  {pago && (
                    <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600">
                      <CheckCircle2 className="size-3.5" /> Pago
                    </div>
                  )}
                  {pend && (
                    <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600">
                      <Clock className="size-3.5" /> Pendente
                    </div>
                  )}
                  {semCob && (
                    <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
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
      )}
    </div>
  );
}
