"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { confirmarPresenca, desmarcarPresenca } from "@/app/arena/actions";
import { Avatar } from "@/components/ui/Avatar";

const NIVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

export type AulaAgenda = {
  id: string;
  titulo: string;
  horario: string | null;
  nivel: string | null;
  maxAlunos: number | null;
  confirmados: number;
  minha: boolean;          // eu já confirmei presença nessa aula/dia
  passou: boolean;         // horário já começou (não dá mais pra confirmar)
  podeDesmarcar: boolean;  // dentro do prazo de cancelamento
  nomes: { nome: string; fotoUrl: string | null }[]; // vazio pra visitante
};

export type DiaAgenda = {
  date: string;      // YYYY-MM-DD
  label: string;     // "Seg, 6 Jul"
  relLabel: string;  // "Hoje" | "Amanhã" | ""
  isToday: boolean;
  aulas: AulaAgenda[];
};

export function AgendaPresenca({
  arenaId,
  isAluno,
  planoLimite,
  usadasSemana,
  dias,
}: {
  arenaId: string;
  isAluno: boolean;
  planoLimite: number | null;
  usadasSemana: number;
  dias: DiaAgenda[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agindo, setAgindo] = useState<string | null>(null);   // `${classId}|${date}` em andamento
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aberta, setAberta] = useState<string | null>(null);   // lista de confirmados expandida

  function agir(aula: AulaAgenda, date: string) {
    const chave = `${aula.id}|${date}`;
    setAgindo(chave);
    setErros((e) => ({ ...e, [chave]: "" }));
    startTransition(async () => {
      const r = aula.minha
        ? await desmarcarPresenca(arenaId, aula.id, date)
        : await confirmarPresenca(arenaId, aula.id, date);
      if (r.error) {
        setErros((e) => ({ ...e, [chave]: r.error! }));
      } else {
        router.refresh();
      }
      setAgindo(null);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700">Agenda de aulas</h2>
        </div>
        {isAluno && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            {planoLimite != null
              ? `Esta semana: ${usadasSemana}/${planoLimite} aulas`
              : "Aulas ilimitadas"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {dias.map((dia) => (
          <div
            key={dia.date}
            className={`rounded-2xl p-3 ring-1 ${
              dia.isToday ? "bg-blue-50 ring-blue-200" : "bg-white ring-black/5"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <p className={`text-sm font-semibold ${dia.isToday ? "text-blue-700" : "text-gray-700"}`}>
                {dia.label}
              </p>
              {dia.relLabel && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  dia.isToday ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {dia.relLabel}
                </span>
              )}
            </div>

            {dia.aulas.length === 0 ? (
              <p className="text-xs text-gray-400">Sem aula neste dia</p>
            ) : (
              <div className="space-y-2">
                {dia.aulas.map((aula) => {
                  const chave = `${aula.id}|${dia.date}`;
                  const lotada = aula.maxAlunos != null && aula.confirmados >= aula.maxAlunos && !aula.minha;
                  const nivelLabel = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : "Todos os níveis";
                  const expandida = aberta === chave;
                  return (
                    <div
                      key={aula.id}
                      className={`rounded-xl p-3 ring-1 ${
                        aula.minha
                          ? "bg-blue-600 ring-blue-600"
                          : dia.isToday ? "bg-white ring-blue-100" : "bg-gray-50 ring-black/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {aula.horario && (
                              <span className={`flex items-center gap-1 text-xs font-bold ${
                                aula.minha ? "text-blue-100" : "text-blue-600"
                              }`}>
                                <Clock className="size-3.5" /> {aula.horario}
                              </span>
                            )}
                            <span className={`text-sm font-semibold ${aula.minha ? "text-white" : "text-gray-800"}`}>
                              {aula.titulo}
                            </span>
                          </div>
                          <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] ${
                            aula.minha ? "text-blue-100" : "text-gray-500"
                          }`}>
                            <span className="font-semibold">{nivelLabel}</span>
                            <span className={aula.minha ? "text-blue-300" : "text-gray-300"}>·</span>
                            <span className={`font-semibold ${
                              lotada && !aula.minha ? "text-red-500" : ""
                            }`}>
                              {aula.maxAlunos != null
                                ? `${aula.confirmados}/${aula.maxAlunos}${lotada ? " · lotada" : ""}`
                                : `${aula.confirmados} confirmado${aula.confirmados === 1 ? "" : "s"}`}
                            </span>
                          </div>
                        </div>

                        {/* Botão de ação — só pra aluno ativo */}
                        {isAluno && !aula.passou && (
                          aula.minha ? (
                            aula.podeDesmarcar ? (
                              <button
                                onClick={() => agir(aula, dia.date)}
                                disabled={pending && agindo === chave}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-60"
                              >
                                {pending && agindo === chave
                                  ? <Loader2 className="size-3.5 animate-spin" />
                                  : <CheckCircle2 className="size-3.5" />}
                                Confirmado · desmarcar
                              </button>
                            ) : (
                              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-100">
                                <CheckCircle2 className="size-3.5" /> Confirmado
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => agir(aula, dia.date)}
                              disabled={(pending && agindo === chave) || lotada}
                              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pending && agindo === chave && <Loader2 className="size-3.5 animate-spin" />}
                              {lotada ? "Lotada" : "Confirmar presença"}
                            </button>
                          )
                        )}
                        {isAluno && aula.passou && (
                          <span className={`shrink-0 text-[11px] ${aula.minha ? "text-blue-200" : "text-gray-400"}`}>
                            {aula.minha ? "Você foi ✓" : "Já começou"}
                          </span>
                        )}
                      </div>

                      {erros[chave] && (
                        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 ring-1 ring-red-100">
                          {erros[chave]}
                        </p>
                      )}

                      {/* Quem já confirmou — só aluno da arena vê os nomes */}
                      {isAluno && aula.confirmados > 0 && aula.nomes.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => setAberta(expandida ? null : chave)}
                            className={`flex items-center gap-1 text-[11px] font-semibold ${
                              aula.minha ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            <Users className="size-3" />
                            Ver quem confirmou
                            {expandida ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </button>
                          {expandida && (
                            <ul className="mt-1.5 space-y-1">
                              {aula.nomes.map((n, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <Avatar nome={n.nome} color="bg-blue-500" size="sm" fotoUrl={n.fotoUrl} />
                                  <span className={`text-xs ${aula.minha ? "text-blue-50" : "text-gray-700"}`}>
                                    {n.nome}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
