"use client";

import { useMemo, useState } from "react";
import {
  CheckSquare,
  Eye,
  Loader2,
  Search,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { enviarComunicado } from "@/app/painel/campeonatos/[id]/comunicacao/actions";

export type Recipient = {
  userId: string;
  nome: string;
  email: string;
  genero: "masculino" | "feminino" | "mista";
};

type Filtro = "todos" | "masculino" | "feminino" | "mista";

const TEMPLATES: Array<{ label: string; titulo: string; mensagem: string }> = [
  {
    label: "Chaveamento publicado",
    titulo: "Chaveamento oficial já disponível!",
    mensagem:
      "Olá, atleta! O chaveamento e os horários iniciais dos jogos já estão disponíveis na página do campeonato. Chegue com 30 minutos de antecedência para o check-in.",
  },
  {
    label: "Abertura da portaria",
    titulo: "Check-in e retirada de kits liberados",
    mensagem:
      "A portaria da arena já está aberta! Apresente seu QR Code de inscrição no check-in para confirmar presença e retirar seu kit atleta.",
  },
  {
    label: "Alteração de horário",
    titulo: "Atenção: atualização na programação",
    mensagem:
      "Tivemos um ajuste na grade de horários das próximas rodadas. Confira sua próxima partida atualizada diretamente na página ao vivo do torneio.",
  },
  {
    label: "Clima / Quadras",
    titulo: "Aviso importante sobre condições climáticas",
    mensagem:
      "Estamos monitorando as condições climáticas na arena e manteremos todas as atualizações em tempo real pelo painel ao vivo. Fique atento às chamadas de quadra.",
  },
];

export function ComunicacaoClient({
  champId,
  recipients,
}: {
  champId: string;
  recipients: Recipient[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [search, setSearch] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(recipients.map((r) => r.userId)),
  );
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  const visiveis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipients.filter((r) => {
      if (filtro !== "todos" && r.genero !== filtro) return false;
      if (!q) return true;
      return r.nome.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [filtro, search, recipients]);

  function aplicarFiltro(f: Filtro) {
    setFiltro(f);
    const grupo =
      f === "todos"
        ? recipients.map((r) => r.userId)
        : recipients.filter((r) => r.genero === f).map((r) => r.userId);
    setSelecionados(new Set(grupo));
  }

  function toggleUm(userId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
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
    if (!titulo.trim()) {
      setResultado({ ok: false, msg: "Informe o título." });
      return;
    }
    if (!mensagem.trim()) {
      setResultado({ ok: false, msg: "Informe a mensagem." });
      return;
    }
    if (destinatariosSelecionados.length === 0) {
      setResultado({ ok: false, msg: "Selecione ao menos um atleta." });
      return;
    }

    setEnviando(true);
    try {
      const res = await enviarComunicado(
        champId,
        titulo,
        mensagem,
        destinatariosSelecionados.map((d) => d.userId),
      );
      if (res.ok) {
        setResultado({
          ok: true,
          msg: `Comunicado enviado para ${res.enviados} atleta${res.enviados !== 1 ? "s" : ""}!`,
        });
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
    { key: "mista", label: "Mista" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Coluna Esquerda: Compositor + Modelos Rápidos + Pré-visualização */}
      <div className="space-y-5 lg:col-span-7">
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              <h2 className="text-sm font-bold text-ink">Modelos rápidos</h2>
            </div>
            <span className="text-xs text-ink-muted">1 clique para preencher</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setTitulo(tpl.titulo);
                  setMensagem(tpl.mensagem);
                }}
                className="rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted">Título do comunicado</label>
              <input
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-blue-500 focus:outline-none"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Alteração no horário de jogo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted">Mensagem aos atletas</label>
              <textarea
                rows={6}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-blue-500 focus:outline-none"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva as orientações que serão enviadas por e-mail e notificação no app..."
              />
            </div>
          </div>

          {resultado && (
            <div
              role="alert"
              className={`rounded-xl border p-3 text-sm font-medium ${
                resultado.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {resultado.msg}
            </div>
          )}

          <button
            type="button"
            onClick={enviar}
            disabled={enviando || destinatariosSelecionados.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {enviando
              ? "Enviando..."
              : `Enviar para ${destinatariosSelecionados.length} atleta${destinatariosSelecionados.length !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Pré-visualização ao vivo */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Eye className="size-3.5 text-blue-600" />
            Pré-visualização do atleta
          </div>
          <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4">
            <p className="text-sm font-bold text-ink">
              {titulo.trim() || "Título do comunicado aparece aqui"}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm text-ink-muted">
              {mensagem.trim() || "Sua mensagem aparecerá neste formato na caixa de entrada e nas notificações dos atletas selecionados."}
            </p>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Segmentação e Lista de Destinatários */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 lg:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Destinatários</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            {selecionados.size} de {recipients.length}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou e-mail..."
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => aplicarFiltro(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filtro === key
                  ? "bg-gray-900 text-white"
                  : "bg-surface-2 text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={toggleTodosVisiveis}
            className="flex w-full items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
          >
            {todosVisiveisSelecionados ? (
              <CheckSquare className="size-4 shrink-0 text-blue-600" />
            ) : (
              <Square className="size-4 shrink-0 text-ink-muted/50" />
            )}
            <span className="text-xs font-bold text-ink">
              Selecionar todos visíveis ({visiveis.length})
            </span>
          </button>

          {visiveis.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              Nenhum atleta encontrado para o filtro atual.
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {visiveis.map((r) => (
                <li key={r.userId}>
                  <button
                    type="button"
                    onClick={() => toggleUm(r.userId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/50"
                  >
                    {selecionados.has(r.userId) ? (
                      <CheckSquare className="size-4 shrink-0 text-blue-600" />
                    ) : (
                      <Square className="size-4 shrink-0 text-ink-muted/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.nome}</p>
                      <p className="truncate text-xs text-ink-muted">{r.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.genero === "masculino"
                          ? "bg-blue-50 text-blue-600"
                          : r.genero === "feminino"
                            ? "bg-pink-50 text-pink-600"
                            : "bg-surface-2 text-ink-muted"
                      }`}
                    >
                      {r.genero === "masculino"
                        ? "Masc"
                        : r.genero === "feminino"
                          ? "Fem"
                          : "Misto"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
