"use client";

import { useState, useMemo } from "react";
import { Send, Loader2, CheckSquare, Square } from "lucide-react";
import { enviarComunicado } from "@/app/painel/campeonatos/[id]/comunicacao/actions";

export type Recipient = {
  userId: string;
  nome: string;
  email: string;
  genero: "masculino" | "feminino" | "mista";
};

type Filtro = "todos" | "masculino" | "feminino";

export function ComunicacaoClient({
  champId,
  recipients,
}: {
  champId: string;
  recipients: Recipient[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(recipients.map((r) => r.userId)),
  );
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  const visiveis = useMemo(() => {
    if (filtro === "masculino") return recipients.filter((r) => r.genero === "masculino");
    if (filtro === "feminino") return recipients.filter((r) => r.genero === "feminino");
    return recipients;
  }, [filtro, recipients]);

  function aplicarFiltro(f: Filtro) {
    setFiltro(f);
    const grupo = f === "masculino"
      ? recipients.filter((r) => r.genero === "masculino").map((r) => r.userId)
      : f === "feminino"
      ? recipients.filter((r) => r.genero === "feminino").map((r) => r.userId)
      : recipients.map((r) => r.userId);
    setSelecionados(new Set(grupo));
  }

  function toggleUm(userId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
    setFiltro("todos"); // reseta label do filtro ao selecionar manualmente
  }

  function toggleTodosVisiveis() {
    const todosIds = visiveis.map((r) => r.userId);
    const todosSelecionados = todosIds.every((id) => selecionados.has(id));
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (todosSelecionados) {
        todosIds.forEach((id) => next.delete(id));
      } else {
        todosIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  const destinatariosSelecionados = recipients.filter((r) => selecionados.has(r.userId));
  const todosVisiveisSelecionados =
    visiveis.length > 0 && visiveis.every((r) => selecionados.has(r.userId));

  async function enviar() {
    setResultado(null);
    if (!titulo.trim()) { setResultado({ ok: false, msg: "Informe o título." }); return; }
    if (!mensagem.trim()) { setResultado({ ok: false, msg: "Informe a mensagem." }); return; }
    if (destinatariosSelecionados.length === 0) { setResultado({ ok: false, msg: "Selecione ao menos um atleta." }); return; }

    setEnviando(true);
    try {
      const res = await enviarComunicado(champId, titulo, mensagem, destinatariosSelecionados);
      if (res.ok) {
        setResultado({ ok: true, msg: `Comunicado enviado para ${res.enviados} atleta${res.enviados !== 1 ? "s" : ""}!` });
        setTitulo("");
        setMensagem("");
      } else {
        setResultado({ ok: false, msg: res.error ?? "Erro ao enviar." });
      }
    } finally {
      setEnviando(false);
    }
  }

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "masculino", label: "Masculina" },
    { key: "feminino", label: "Feminina" },
  ];

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Alteração no horário de jogo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Mensagem</label>
          <textarea
            rows={5}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Escreva o comunicado para os atletas..."
          />
        </div>
      </div>

      {/* Seleção de destinatários */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Destinatários
          </h2>
          <span className="text-xs text-gray-400">
            {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filtros rápidos */}
        <div className="mb-3 flex gap-2">
          {FILTROS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => aplicarFiltro(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filtro === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {/* Cabeçalho: selecionar todos os visíveis */}
          <button
            onClick={toggleTodosVisiveis}
            className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            {todosVisiveisSelecionados ? (
              <CheckSquare className="size-4 shrink-0 text-blue-600" />
            ) : (
              <Square className="size-4 shrink-0 text-gray-300" />
            )}
            <span className="text-sm font-medium text-gray-700">
              Selecionar todos ({visiveis.length})
            </span>
          </button>

          {visiveis.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Nenhum atleta nessa categoria.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {visiveis.map((r) => (
                <li key={r.userId}>
                  <button
                    onClick={() => toggleUm(r.userId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    {selecionados.has(r.userId) ? (
                      <CheckSquare className="size-4 shrink-0 text-blue-600" />
                    ) : (
                      <Square className="size-4 shrink-0 text-gray-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{r.nome}</p>
                      <p className="truncate text-xs text-gray-400">{r.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      r.genero === "masculino"
                        ? "bg-blue-50 text-blue-600"
                        : r.genero === "feminino"
                        ? "bg-pink-50 text-pink-600"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.genero === "masculino" ? "Masc" : r.genero === "feminino" ? "Fem" : "Misto"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Feedback */}
      {resultado && (
        <div className={`rounded-xl p-3 text-sm font-medium ${
          resultado.ok
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : "bg-red-50 text-red-600 ring-1 ring-red-200"
        }`}>
          {resultado.msg}
        </div>
      )}

      {/* Botão enviar */}
      <button
        onClick={enviar}
        disabled={enviando || destinatariosSelecionados.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {enviando
          ? "Enviando..."
          : `Enviar para ${destinatariosSelecionados.length} atleta${destinatariosSelecionados.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
