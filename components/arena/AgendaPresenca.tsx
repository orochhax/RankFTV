"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Loader2, Users, ChevronDown, ChevronUp, AlertCircle, CreditCard } from "lucide-react";
import { confirmarPresenca, desmarcarPresenca } from "@/app/arena/actions";
import { Avatar } from "@/components/ui/Avatar";
import { horarioLabel, PUBLICO_LABEL, type PublicoAula } from "@/lib/arena-dates";
import { formatBRL } from "@/lib/format";

const NIVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

export type AulaAgenda = {
  id: string;
  titulo: string;
  horaInicio: string | null;
  horaFim: string | null;
  nivel: string | null;
  publico: PublicoAula;
  maxAlunos: number | null;
  valorAvulso: number | null;
  confirmados: number;
  minha: boolean;          // eu já confirmei presença nessa aula/dia
  minhaTipoCobranca: "credito" | "avulsa" | null;
  minhaPagamentoStatus: "nao_aplicavel" | "pendente" | "processando" | "pago" | "falhou" | null;
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
  handle,
  isAluno,
  planoLimite,
  usadasSemana,
  creditoDisponivel,
  temCartaoSalvo,
  generoPerfil,
  dias,
}: {
  arenaId: string;
  handle: string;
  isAluno: boolean;
  planoLimite: number | null;
  usadasSemana: number;
  /** Se o aluno tem crédito de plano disponível AGORA (mesma regra em toda a arena). */
  creditoDisponivel: boolean;
  temCartaoSalvo: boolean;
  generoPerfil: "masculino" | "feminino" | "outro" | null;
  dias: DiaAgenda[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agindo, setAgindo] = useState<string | null>(null);   // `${classId}|${date}` em andamento
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aberta, setAberta] = useState<string | null>(null);   // lista de confirmados expandida
  const [confirmandoAvulsa, setConfirmandoAvulsa] = useState<string | null>(null); // aguardando 2º clique

  function elegivelGenero(publico: PublicoAula): boolean {
    return publico === "misto" || generoPerfil === publico;
  }

  // avulsaConfirmada só é true quando esta chamada vem do botão "Sim,
  // confirmar" do preview — o servidor também reforça essa regra (nunca
  // reserva avulsa sem confirmação explícita), então mesmo se o palpite do
  // cliente sobre ter crédito estiver desatualizado (corrida com outra
  // aba), a resposta AVULSA_PREVIEW reabre o preview em vez de cobrar direto.
  function agir(aula: AulaAgenda, date: string, avulsaConfirmada = false) {
    const chave = `${aula.id}|${date}`;
    setAgindo(chave);
    setErros((e) => ({ ...e, [chave]: "" }));
    startTransition(async () => {
      const r = aula.minha
        ? await desmarcarPresenca(arenaId, aula.id, date)
        : await confirmarPresenca(arenaId, aula.id, date, avulsaConfirmada);
      if (r.error === "AVULSA_PREVIEW") {
        setConfirmandoAvulsa(chave);
      } else if (r.error === "PERFIL_SEM_GENERO" || r.error === "CARTAO_NECESSARIO") {
        setErros((e) => ({ ...e, [chave]: r.error! }));
      } else if (r.error) {
        setErros((e) => ({ ...e, [chave]: r.error! }));
      } else {
        setConfirmandoAvulsa(null);
        router.refresh();
      }
      setAgindo(null);
    });
  }

  function clicarConfirmar(aula: AulaAgenda, date: string) {
    const chave = `${aula.id}|${date}`;
    const precisaAvulsa = !creditoDisponivel && aula.valorAvulso != null;
    if (precisaAvulsa && !temCartaoSalvo) {
      // Sem crédito e sem cartão salvo: nem adianta mostrar o preview de
      // valor — direciona direto pro Financeiro, igual ao erro do servidor.
      setErros((e) => ({ ...e, [chave]: "CARTAO_NECESSARIO" }));
      return;
    }
    if (precisaAvulsa && confirmandoAvulsa !== chave) {
      // Primeiro clique de uma aula avulsa: só mostra o valor, não confirma ainda.
      setConfirmandoAvulsa(chave);
      return;
    }
    agir(aula, date, confirmandoAvulsa === chave);
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
              : planoLimite === null && creditoDisponivel
              ? "Aulas ilimitadas"
              : "Sem plano ativo"}
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
                  const restritaGenero = aula.publico !== "misto" && !aula.minha;
                  const semAcessoGenero = restritaGenero && !elegivelGenero(aula.publico);
                  const semCredito = !creditoDisponivel && !aula.minha;
                  const seriaAvulsa = semCredito && aula.valorAvulso != null;
                  const bloqueadaSemPlano = semCredito && aula.valorAvulso == null;
                  const aguardandoConfirmacaoAvulsa = confirmandoAvulsa === chave;
                  const horario = horarioLabel(aula.horaInicio, aula.horaFim);

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
                            {horario && (
                              <span className={`flex items-center gap-1 text-xs font-bold ${
                                aula.minha ? "text-blue-100" : "text-blue-600"
                              }`}>
                                <Clock className="size-3.5" /> {horario}
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
                            {aula.publico !== "misto" && (
                              <>
                                <span className={aula.minha ? "text-blue-300" : "text-gray-300"}>·</span>
                                <span className="font-semibold">{PUBLICO_LABEL[aula.publico]}</span>
                              </>
                            )}
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
                          ) : semAcessoGenero || bloqueadaSemPlano ? (
                            <span className="shrink-0 text-[11px] font-semibold text-gray-400">
                              {semAcessoGenero ? "Aula restrita" : "Requer plano"}
                            </span>
                          ) : (
                            <button
                              onClick={() => clicarConfirmar(aula, dia.date)}
                              disabled={(pending && agindo === chave) || lotada}
                              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pending && agindo === chave && <Loader2 className="size-3.5 animate-spin" />}
                              {lotada ? "Lotada" : seriaAvulsa ? "Confirmar (avulsa)" : "Confirmar presença"}
                            </button>
                          )
                        )}
                        {isAluno && aula.passou && (
                          <span className={`shrink-0 text-[11px] ${aula.minha ? "text-blue-200" : "text-gray-400"}`}>
                            {aula.minha ? "Você foi ✓" : "Já começou"}
                          </span>
                        )}
                      </div>

                      {/* Preview de aula avulsa — precisa de um segundo clique pra confirmar */}
                      {aguardandoConfirmacaoAvulsa && aula.valorAvulso != null && (
                        <div className="mt-2 rounded-lg bg-white/10 px-2.5 py-2 text-xs">
                          <p className={aula.minha ? "text-white" : "text-gray-700"}>
                            Você não tem crédito de plano disponível — esta será uma{" "}
                            <strong>aula avulsa de {formatBRL(aula.valorAvulso)}</strong>, cobrada só se você
                            comparecer e o professor confirmar sua presença.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => agir(aula, dia.date, true)}
                              disabled={pending && agindo === chave}
                              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {pending && agindo === chave && <Loader2 className="size-3.5 animate-spin" />}
                              Sim, confirmar
                            </button>
                            <button
                              onClick={() => setConfirmandoAvulsa(null)}
                              className="rounded-lg bg-black/10 px-3 py-1.5 font-medium text-gray-700 hover:bg-black/20"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Meu status financeiro, quando essa reserva é avulsa */}
                      {aula.minha && aula.minhaTipoCobranca === "avulsa" && aula.minhaPagamentoStatus && aula.minhaPagamentoStatus !== "nao_aplicavel" && (
                        <p className="mt-2 text-[11px] font-semibold text-blue-100">
                          {aula.minhaPagamentoStatus === "pago" && "Aula avulsa paga"}
                          {aula.minhaPagamentoStatus === "pendente" && "Aula avulsa · cobrança pendente"}
                          {aula.minhaPagamentoStatus === "processando" && "Aula avulsa · cobrando…"}
                          {aula.minhaPagamentoStatus === "falhou" && (
                            <>
                              Pagamento falhou —{" "}
                              <Link href={`/arenas/${handle}/financeiro`} className="underline">resolver no Financeiro</Link>
                            </>
                          )}
                        </p>
                      )}

                      {erros[chave] === "PERFIL_SEM_GENERO" && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 ring-1 ring-red-100">
                          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                          <span>
                            Esta aula é restrita por gênero. Complete seu perfil pra confirmar presença —{" "}
                            <Link href="/perfil/questionario" className="font-semibold underline">completar perfil</Link>.
                          </span>
                        </p>
                      )}
                      {erros[chave] === "CARTAO_NECESSARIO" && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 ring-1 ring-red-100">
                          <CreditCard className="mt-0.5 size-3.5 shrink-0" />
                          <span>
                            Você precisa de um cartão salvo pra confirmar aulas avulsas —{" "}
                            <Link href={`/arenas/${handle}/financeiro`} className="font-semibold underline">cadastrar cartão</Link>.
                          </span>
                        </p>
                      )}
                      {erros[chave] && erros[chave] !== "PERFIL_SEM_GENERO" && erros[chave] !== "CARTAO_NECESSARIO" && (
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
