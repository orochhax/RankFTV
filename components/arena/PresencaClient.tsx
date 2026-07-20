"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, CalendarDays } from "lucide-react";
import { marcarPresenca } from "@/app/arena/presenca/actions";

type AulaHoje = { id: string; titulo: string; horario: string | null; jaFez: boolean };
type HistoricoItem = { data: string; titulo: string };

// confirmarPresenca devolve alguns erros como código, não texto pronto —
// os dois exigem uma ação (link), não só uma frase, então tratamos à parte
// do texto genérico de erro.
function mensagemErro(codigo: string): React.ReactNode {
  if (codigo === "PERFIL_SEM_GENERO") {
    return <>Esta aula é restrita por gênero. <Link href="/perfil/questionario" className="font-semibold underline">Complete seu perfil</Link> pra confirmar presença.</>;
  }
  if (codigo === "CARTAO_NECESSARIO") {
    return "Você não tem crédito de plano disponível e precisa de um cartão salvo pra confirmar aulas avulsas. Cadastre um cartão no Financeiro da arena (acessível pela página pública da arena).";
  }
  if (codigo === "AVULSA_PREVIEW") {
    return "Você não tem crédito de plano disponível — esta seria uma aula avulsa, cobrada só se você comparecer. Confirme pela agenda completa na página da arena, onde você vê o valor antes de confirmar.";
  }
  return codigo;
}

export function PresencaClient({
  arenaId,
  aulasHoje,
  historico,
  hoje,
}: {
  arenaId: string;
  aulasHoje: AulaHoje[];
  historico: HistoricoItem[];
  hoje: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<React.ReactNode | null>(null);

  function marcar(classId: string) {
    setErro(null);
    startTransition(async () => {
      const r = await marcarPresenca(classId, arenaId);
      if (r?.error) setErro(mensagemErro(r.error));
    });
  }

  const formatData = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day:     "2-digit",
      month:   "short",
    });

  return (
    <div className="space-y-6">
      {/* Aulas de hoje */}
      <section>
        <p className="mb-3 text-sm font-semibold text-gray-700">
          Aulas de hoje — {formatData(hoje)}
        </p>
        {erro && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
            {erro}
          </p>
        )}
        {aulasHoje.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
            Nenhuma aula agendada para hoje.
          </p>
        ) : (
          <ul className="space-y-2">
            {aulasHoje.map((a) => (
              <li
                key={a.id}
                className={`flex items-center justify-between gap-3 rounded-2xl p-4 ring-1 transition-colors ${
                  a.jaFez
                    ? "bg-blue-50 ring-blue-100"
                    : "bg-white ring-black/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  {a.jaFez ? (
                    <CheckCircle2 className="size-5 shrink-0 text-blue-500" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-gray-300" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                    {a.horario && (
                      <p className="text-xs text-gray-400">{a.horario}</p>
                    )}
                  </div>
                </div>
                {!a.jaFez && (
                  <button
                    onClick={() => marcar(a.id)}
                    disabled={pending}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending && <Loader2 className="size-3 animate-spin" />}
                    Marcar presença
                  </button>
                )}
                {a.jaFez && (
                  <span className="text-xs font-semibold text-blue-600">Presente!</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Histórico */}
      {historico.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-blue-400" />
            <p className="text-sm font-semibold text-gray-700">Últimas presenças</p>
          </div>
          <ul className="space-y-1.5">
            {historico.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                <span className="flex-1">{h.titulo}</span>
                <span className="text-xs text-gray-400">{formatData(h.data)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
