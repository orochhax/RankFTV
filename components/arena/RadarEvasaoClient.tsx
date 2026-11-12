"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MessageCircle,
  Search,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import type { RadarAlunoAlerta, RadarEvasaoReport, RiscoEvasao } from "@/lib/arena-radar-evasao-core";

type FiltroRadar = "alerta" | "critico" | "atencao" | "saudavel" | "todos";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDateBR(iso: string | null) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Nunca registrou presença";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function riscoBadge(risco: RiscoEvasao) {
  if (risco === "critico") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF3F2] px-2.5 py-0.5 text-[11px] font-bold text-[#DC2626]">
        <AlertTriangle className="size-3" />
        Risco crítico
      </span>
    );
  }
  if (risco === "atencao") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFAEB] px-2.5 py-0.5 text-[11px] font-bold text-[#D97706]">
        <Clock className="size-3" />
        Em atenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-bold text-[#16A34A]">
      <CheckCircle2 className="size-3" />
      Frequência saudável
    </span>
  );
}

export function RadarEvasaoClient({
  arenaNome,
  report,
}: {
  arenaNome: string;
  report: RadarEvasaoReport;
}) {
  const [filtro, setFiltro] = useState<FiltroRadar>("alerta");
  const [busca, setBusca] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return report.alunos.filter((aluno) => {
      if (filtro === "alerta" && aluno.risco === "saudavel") return false;
      if (filtro === "critico" && aluno.risco !== "critico") return false;
      if (filtro === "atencao" && aluno.risco !== "atencao") return false;
      if (filtro === "saudavel" && aluno.risco !== "saudavel") return false;
      if (!q) return true;
      return (
        aluno.nome.toLowerCase().includes(q) ||
        aluno.username.toLowerCase().includes(q)
      );
    });
  }, [report.alunos, filtro, busca]);

  async function copiarMensagem(aluno: RadarAlunoAlerta) {
    try {
      await navigator.clipboard.writeText(aluno.mensagemWhatsapp);
      setCopiedId(aluno.userId);
      setTimeout(() => {
        setCopiedId((curr) => (curr === aluno.userId ? null : curr));
      }, 2500);
    } catch {
      // Fallback silencioso caso o navegador bloqueie clipboard sem interação
    }
  }

  const { resumo } = report;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-ink">
              <Sparkles className="size-3" />
              Inteligência Pro
            </span>
            <span className="text-xs font-medium text-ink-muted">{arenaNome}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-ink">
            Radar Anti-Evasão Ativo
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Monitoramento automático de faltas, queda de frequência nos últimos 30 dias e mensalidades em risco.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-ink-muted shadow-xs">
          Base analisada: <strong className="text-ink">{resumo.totalAtivos} alunos ativos</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-brand-dark p-4 text-white shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
            <AlertTriangle className="size-4" />
            Em alerta agora
          </div>
          <p className="mt-2 text-2xl font-black leading-none">{resumo.emAlerta}</p>
          <p className="mt-1 text-xs text-app-bg/75">
            {resumo.riscoCritico} críticos · {resumo.riscoAtencao} atenção
          </p>
        </div>

        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF3F2] p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
            <TrendingDown className="size-4" />
            Risco crítico (21d+)
          </div>
          <p className="mt-2 text-2xl font-black leading-none text-[#DC2626]">
            {resumo.riscoCritico}
          </p>
          <p className="mt-1 text-xs text-[#991B1B]/80">prioridade máxima hoje</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-ink">
            <Sparkles className="size-4 text-brand" />
            Receita mensal em risco
          </div>
          <p className="mt-2 text-2xl font-black leading-none text-ink">
            {formatBRL(resumo.receitaMensalEmRisco)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">MRR de alunos ausentes</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
            <Users className="size-4 text-[#16A34A]" />
            Engajamento da base
          </div>
          <p className="mt-2 text-2xl font-black leading-none text-ink">
            {resumo.taxaEngajamentoPercent}%
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {resumo.saudaveis} alunos assíduos
          </p>
        </div>
      </div>

      {/* Aviso inteligente se houver alunos em falta */}
      {resumo.emAlerta > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-brand-border bg-brand-soft p-4 text-ink sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">
                {resumo.emAlerta} aluno{resumo.emAlerta > 1 ? "s faltando" : " faltando"} com sinal de afastamento
              </p>
              <p className="text-xs text-ink-muted">
                Abordar nos primeiros 15 dias de ausência reduz o cancelamento em até 65%. Use as mensagens prontas abaixo.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-ink ring-1 ring-brand-border">
            MRR protegido: {formatBRL(resumo.receitaMensalEmRisco)}
          </span>
        </div>
      )}

      {/* Filtros + Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "alerta", label: `Em alerta (${resumo.emAlerta})` },
            { key: "critico", label: `Crítico (${resumo.riscoCritico})` },
            { key: "atencao", label: `Atenção (${resumo.riscoAtencao})` },
            { key: "saudavel", label: `Assíduos (${resumo.saudaveis})` },
            { key: "todos", label: `Todos (${resumo.totalAtivos})` },
          ].map((tab) => {
            const ativo = filtro === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFiltro(tab.key as FiltroRadar)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  ativo
                    ? "bg-brand text-white shadow-xs"
                    : "border border-border bg-white text-ink-muted hover:border-brand hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-xs font-medium text-ink placeholder:text-ink-muted/70 focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Alunos */}
      {listaFiltrada.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-xs">
          <CheckCircle2 className="mx-auto size-8 text-[#16A34A]" />
          <p className="mt-2 text-sm font-bold text-ink">
            Nenhum aluno neste recorte
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Tente alternar os filtros acima para visualizar outros grupos de frequência.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((aluno) => {
            const phoneDigits = (aluno.telefone ?? "").replace(/\D/g, "");
            const waUrl =
              phoneDigits.length >= 10
                ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent(aluno.mensagemWhatsapp)}`
                : null;
            const copiado = copiedId === aluno.userId;

            return (
              <div
                key={aluno.userId}
                className="rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-ink">{aluno.nome}</h2>
                      <span className="text-xs font-medium text-ink-muted">@{aluno.username}</span>
                      {riscoBadge(aluno.risco)}
                      {aluno.cobrancaPendente && (
                        <span className="rounded-full border border-[#FDE68A] bg-[#FFFAEB] px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                          Mensalidade pendente
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-ink">{aluno.motivo}</p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-muted">
                      <span>
                        Último treino: <strong className="text-ink">{formatDateBR(aluno.ultimoTreinoISO)}</strong>{" "}
                        ({aluno.diasSemTreinar}d atrás)
                      </span>
                      <span>
                        Últimos 30d: <strong className="text-ink">{aluno.aulasUltimos30d} aulas</strong>{" "}
                        (antes: {aluno.aulas30a60d})
                      </span>
                      <span>
                        Plano: <strong className="text-ink">{aluno.planoNome ?? "Mensalista"}</strong> ·{" "}
                        <strong className="text-ink">{formatBRL(aluno.mensalidade)}/mês</strong>
                      </span>
                    </div>

                    <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-muted">
                      <strong className="text-ink">Ação recomendada:</strong> {aluno.acaoSugerida}
                    </p>
                  </div>

                  {aluno.risco !== "saudavel" && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      <button
                        type="button"
                        onClick={() => copiarMensagem(aluno)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:border-brand hover:text-brand-ink"
                      >
                        {copiado ? (
                          <>
                            <Check className="size-3.5 text-[#16A34A]" />
                            Mensagem copiada!
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            Copiar mensagem WhatsApp
                          </>
                        )}
                      </button>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover"
                        >
                          <MessageCircle className="size-3.5" />
                          Chamar no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
