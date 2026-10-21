"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Cloud, LoaderCircle, MonitorCog, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  approveAiRefresh,
  discardAiRefresh,
  requestAiRefresh,
} from "@/app/admin/evolucao/actions";
import type { AiJobActionState } from "@/app/admin/evolucao/actions";
import { activeAiJobStatuses, type EvolutionAiJobStatus } from "@/lib/evolution/ai-job";

type Preview = ReturnType<typeof import("@/lib/evolution/ai-job").summarizeAiJobResult>;

type Job = {
  id: string;
  status: EvolutionAiJobStatus;
  stage: string;
  progressMessage: string;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  preview: Preview;
} | null;

const statusLabels: Record<EvolutionAiJobStatus, string> = {
  queued_analysis: "Aguardando o computador",
  analyzing: "Analisando e pesquisando",
  awaiting_approval: "Prévia pronta para aprovação",
  queued_apply: "Atualização aprovada",
  applying: "Aplicando atualização",
  completed: "Atualização concluída",
  failed: "A atualização encontrou um erro",
  cancelled: "Prévia descartada",
};

const initialActionState: AiJobActionState = { ok: false, message: "" };

export function EvolutionAiRefresh({ job, workerOnline, workerLastSeen }: {
  job: Job;
  workerOnline: boolean;
  workerLastSeen: string | null;
}) {
  const router = useRouter();
  const [requestState, requestAction, requestPending] = useActionState(requestAiRefresh, initialActionState);
  const [approveState, approveAction, approvePending] = useActionState(approveAiRefresh, initialActionState);
  const [discardState, discardAction, discardPending] = useActionState(discardAiRefresh, initialActionState);
  const active = job ? activeAiJobStatuses.includes(job.status as (typeof activeAiJobStatuses)[number]) : false;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  const actionState = approveState.message ? approveState : discardState.message ? discardState : requestState;
  const canRequest = !job || ["completed", "failed", "cancelled"].includes(job.status);

  return (
    <section className="evo-panel evo-ai-control" aria-labelledby="evo-ai-control-title">
      <div className="evo-ai-control-head">
        <div className="evo-ai-control-title">
          <span><Sparkles size={20} /></span>
          <div><p className="evo-eyebrow">ATUALIZAÇÃO ASSISTIDA</p><h2 id="evo-ai-control-title">Atualizar tudo com IA</h2></div>
        </div>
        <div className={`evo-worker-state${workerOnline ? " is-online" : ""}`}>
          <MonitorCog size={16} />
          <span>{workerOnline ? "Seu PC está conectado" : "Aguardando seu PC"}</span>
        </div>
      </div>

      <p className="evo-ai-control-description">Analisa suas métricas, sincroniza roadmap e RankFTV, pesquisa as fontes do Rocha Tech e reavalia todas as ideias. Nada é aplicado antes da sua aprovação.</p>

      {job ? (
        <div className={`evo-ai-job is-${job.status}`}>
          <div className="evo-ai-job-status">
            {active ? <LoaderCircle className="is-spinning" size={20} /> : job.status === "completed" ? <Check size={20} /> : job.status === "failed" ? <X size={20} /> : <Cloud size={20} />}
            <div><strong>{statusLabels[job.status]}</strong><small>{job.progressMessage}</small></div>
          </div>

          {job.status === "awaiting_approval" ? (
            <div className="evo-ai-preview">
              <div className="evo-ai-preview-score"><strong>{job.preview.score ?? "—"}</strong><small>/100</small></div>
              <div className="evo-ai-preview-copy">
                <p className="evo-eyebrow">DIAGNÓSTICO DA IA</p>
                <h3>{job.preview.verdict ?? "Análise concluída"}</h3>
                {job.preview.summary ? <p>{job.preview.summary}</p> : null}
              </div>
              {job.preview.actions.length ? <ol>{job.preview.actions.map((action) => <li key={action}>{action}</li>)}</ol> : null}
              <div className="evo-ai-research-summary">
                <span><strong>{job.preview.itemCount}</strong> notícias avaliadas</span>
                <span><strong>{job.preview.trendCount}</strong> tendências</span>
                <span><strong>{job.preview.ideas.length}</strong> principais ideias exibidas</span>
              </div>
              {job.preview.ideas.length ? <div className="evo-ai-idea-list">{job.preview.ideas.map((idea) => <div key={idea.title}><span>{idea.score}</span><strong>{idea.title}</strong><small>{idea.state?.replaceAll("_", " ") ?? "avaliada"}</small></div>)}</div> : null}
              <div className="evo-ai-approval-note"><ShieldCheck size={18} /><p>Ao aplicar, o agente local importará os snapshots, registrará esta análise e atualizará o ranking do Rocha Tech em Production.</p></div>
              <div className="evo-ai-actions">
                <form action={approveAction}><input type="hidden" name="jobId" value={job.id} /><button className="evo-ai-primary" disabled={approvePending || discardPending}>{approvePending ? "Aprovando…" : "Aplicar atualização"}</button></form>
                <form action={discardAction}><input type="hidden" name="jobId" value={job.id} /><button className="evo-ai-secondary" disabled={approvePending || discardPending}>{discardPending ? "Descartando…" : "Descartar prévia"}</button></form>
              </div>
            </div>
          ) : null}

          {job.status === "failed" && job.errorMessage ? <p className="evo-ai-error">{job.errorMessage}</p> : null}
        </div>
      ) : null}

      {canRequest ? <form action={requestAction}><button className="evo-ai-primary" disabled={requestPending}><RefreshCw size={17} />{requestPending ? "Criando solicitação…" : job ? "Executar nova atualização" : "Atualizar tudo com IA"}</button></form> : null}
      {actionState.message ? <p className={`evo-ai-feedback${actionState.ok ? " is-success" : " is-error"}`}>{actionState.message}</p> : null}
      {!workerOnline && workerLastSeen ? <small className="evo-ai-last-seen">Último contato do agente: {workerLastSeen}.</small> : null}
    </section>
  );
}
