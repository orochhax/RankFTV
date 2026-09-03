"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, History, Inbox, Loader2, MailCheck, RefreshCcw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import {
  atualizarCasoSuporte,
  buscarIngressosSuporte,
  corrigirEmailAtletaSuporte,
  criarCasoSuporte,
  invalidarCredencialSuporte,
  listarCasosSuporte,
  listarEventosCredenciaisSuporte,
  listarLogsSuporte,
  listarOperacaoEmails,
  reenviarCredencialSuporte,
  type EmailOperationsSummary,
  type SupportCase,
  type SupportCredentialEvent,
  type SupportAuditLog,
  type SupportTicket,
} from "@/app/admin/suporte/actions";

const FIELD_LABELS: Record<string, string> = {
  comprador_nome: "nome do atleta 1",
  comprador_cpf: "CPF do atleta 1",
  comprador_email: "e-mail do atleta 1",
  comprador_zap: "WhatsApp do atleta 1",
  comprador_genero: "gênero do atleta 1",
  parceiro_nome: "nome do atleta 2",
  parceiro_cpf: "CPF do atleta 2",
  parceiro_email: "e-mail do atleta 2",
  parceiro_zap: "WhatsApp do atleta 2",
  parceiro_genero: "gênero do atleta 2",
};

function formatDateKey(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function TicketSupportCenter({
  initialLogs,
  initialCredentialEvents,
  initialEmailSummary,
  initialCases,
}: {
  initialLogs: SupportAuditLog[];
  initialCredentialEvents: SupportCredentialEvent[];
  initialEmailSummary: EmailOperationsSummary | null;
  initialCases: SupportCase[];
}) {
  const [term, setTerm] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ ticket: SupportTicket; slot: 1 | 2 } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState(initialLogs);
  const [logsTicketId, setLogsTicketId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [logsPending, startLogsTransition] = useTransition();
  const [credentialEvents, setCredentialEvents] = useState(initialCredentialEvents);
  const [emailSummary, setEmailSummary] = useState(initialEmailSummary);
  const [cases, setCases] = useState(initialCases);
  const [credentialOperation, setCredentialOperation] = useState<{
    ticketId: string;
    credentialId: string;
    slot: 1 | 2;
    type: "resend" | "invalidate";
  } | null>(null);
  const [operationReason, setOperationReason] = useState("");
  const [operationConfirmation, setOperationConfirmation] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [caseDraft, setCaseDraft] = useState<{ ticketId?: string; credentialId?: string } | null>(null);
  const [caseType, setCaseType] = useState("outro");
  const [caseSummary, setCaseSummary] = useState("");
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});

  function loadLogs(options: {
    ticketId?: string | null;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const ticketId = options.ticketId === undefined ? logsTicketId : options.ticketId;
    const selectedDateFrom = options.dateFrom === undefined ? appliedDateFrom : options.dateFrom;
    const selectedDateTo = options.dateTo === undefined ? appliedDateTo : options.dateTo;
    setError(null);
    startLogsTransition(async () => {
      const result = await listarLogsSuporte({
        ticketId: ticketId ?? undefined,
        dateFrom: selectedDateFrom || undefined,
        dateTo: selectedDateTo || undefined,
      });
      if (!result.ok) { setError(result.error ?? "Falha ao carregar histórico."); return; }
      setLogs(result.logs ?? []);
      setLogsTicketId(ticketId);
      setAppliedDateFrom(selectedDateFrom);
      setAppliedDateTo(selectedDateTo);
    });
  }

  function filterLogsByDate() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    loadLogs({ dateFrom, dateTo });
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
    loadLogs({ dateFrom: "", dateTo: "" });
  }

  function search() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await buscarIngressosSuporte(term);
      if (!result.ok) { setError(result.error ?? "Falha na consulta."); return; }
      setTickets(result.tickets ?? []);
    });
  }

  function saveEmail() {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await corrigirEmailAtletaSuporte({
        ticketId: editing.ticket.id,
        athleteSlot: editing.slot,
        newEmail,
        reason,
      });
      if (!result.ok) { setError(result.error ?? "Falha na correção."); return; }
      setSuccess("E-mail corrigido, tokens rotacionados e credencial reenviada.");
      setEditing(null);
      setNewEmail("");
      setReason("");
      const refreshed = await buscarIngressosSuporte(term);
      if (refreshed.ok) setTickets(refreshed.tickets ?? []);
      loadLogs();
    });
  }

  function refreshOperations(ticketId?: string) {
    startLogsTransition(async () => {
      const [eventsResult, emailResult, casesResult] = await Promise.all([
        listarEventosCredenciaisSuporte(ticketId),
        listarOperacaoEmails(),
        listarCasosSuporte(),
      ]);
      if (eventsResult.ok) setCredentialEvents(eventsResult.events ?? []);
      if (emailResult.ok) setEmailSummary(emailResult.summary ?? null);
      if (casesResult.ok) setCases(casesResult.cases ?? []);
    });
  }

  function runCredentialOperation() {
    if (!credentialOperation) return;
    setError(null);
    setSuccess(null);
    setOperationError(null);
    startTransition(async () => {
      const common = {
        ticketId: credentialOperation.ticketId,
        credentialId: credentialOperation.credentialId,
        reason: operationReason,
      };
      const result = credentialOperation.type === "resend"
        ? await reenviarCredencialSuporte(common)
        : await invalidarCredencialSuporte({ ...common, confirmation: operationConfirmation });
      if (!result.ok) {
        setOperationError(result.error ?? "Falha na operação da credencial.");
        return;
      }
      setSuccess(credentialOperation.type === "resend" ? "Credencial reenviada com auditoria." : "Credencial anterior invalidada e nova emissão enviada.");
      const ticketId = credentialOperation.ticketId;
      setCredentialOperation(null);
      setOperationReason("");
      setOperationConfirmation("");
      setOperationError(null);
      const refreshed = await buscarIngressosSuporte(term);
      if (refreshed.ok) setTickets(refreshed.tickets ?? []);
      refreshOperations(ticketId);
      loadLogs({ ticketId });
    });
  }

  function createCase() {
    if (!caseDraft) return;
    setError(null);
    startTransition(async () => {
      const result = await criarCasoSuporte({
        ticketId: caseDraft.ticketId,
        credentialId: caseDraft.credentialId,
        caseType,
        summary: caseSummary,
      });
      if (!result.ok) { setError(result.error ?? "Falha ao abrir o caso."); return; }
      setSuccess("Caso adicionado à fila de suporte.");
      setCaseDraft(null);
      setCaseSummary("");
      setCaseType("outro");
      refreshOperations();
    });
  }

  function updateCase(item: SupportCase, status: SupportCase["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await atualizarCasoSuporte({
        caseId: item.id,
        status,
        note: caseNotes[item.id] ?? "Status atualizado pelo atendimento.",
      });
      if (!result.ok) { setError(result.error ?? "Falha ao atualizar o caso."); return; }
      setCaseNotes((current) => ({ ...current, [item.id]: "" }));
      setSuccess("Caso atualizado e nota registrada.");
      refreshOperations();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-950">
            Use somente após confirmar a identidade e o pagamento do solicitante. Toda correção exige motivo e fica registrada na auditoria.
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MailCheck className="size-5 text-blue-600" /> Operação de e-mails
            </h2>
            <p className="mt-1 text-sm text-gray-500">Métricas dos últimos 30 dias, sem expor os destinatários.</p>
          </div>
          <button type="button" onClick={() => refreshOperations()} disabled={logsPending} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60">
            <RefreshCcw className={`size-3.5 ${logsPending ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
        {emailSummary ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {[
                ["Aceitos", emailSummary.accepted], ["Entregues", emailSummary.delivered],
                ["Na fila", emailSummary.queued], ["Falhas", emailSummary.failed],
                ["Bounces", emailSummary.bounced], ["Reclamações", emailSummary.complained],
                ["Tempo médio", emailSummary.averageDeliverySeconds === null ? "—" : `${emailSummary.averageDeliverySeconds}s`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {emailSummary.pendingCredentials.length > 0 && (
              <div className="mt-4 max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100 px-3">
                {emailSummary.pendingCredentials.map((item) => (
                  <div key={item.credentialId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{item.athleteName}</p>
                      <p className="truncate text-xs text-gray-500">{item.championshipName} · atleta {item.athleteSlot}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOperationError(null);
                        setCredentialOperation({ ticketId: item.ticketId, credentialId: item.credentialId, slot: item.athleteSlot, type: "resend" });
                        setOperationReason("Nova tentativa controlada após falha ou atraso de entrega.");
                      }}
                      className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ))}
              </div>
            )}
            {emailSummary.pendingPixRefunds.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Estornos Pix que exigem acompanhamento humano</p>
                <div className="mt-2 max-h-56 divide-y divide-amber-200/70 overflow-y-auto">
                  {emailSummary.pendingPixRefunds.map((item) => (
                    <div key={item.operationId} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-amber-950">
                          {item.amount == null ? "Valor indisponível" : item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p className="truncate text-xs text-amber-800">
                          {item.providerStatus === "REFUND_REQUESTED"
                            ? "Aguardando processamento financeiro"
                            : item.providerStatus === "AWAITING_CRITICAL_ACTION_AUTHORIZATION"
                              ? "Aguardando autorização financeira"
                              : "Aguardando confirmação financeira"}
                        </p>
                        <p className="truncate font-mono text-[10px] text-amber-700">{item.ticketId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCaseDraft({ ticketId: item.ticketId });
                          setCaseType("estorno_pix");
                          setCaseSummary("Acompanhar estorno Pix pendente de confirmação pelo processador de pagamentos.");
                        }}
                        className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-300"
                      >
                        Abrir caso
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Execute a migration operacional para ativar estas métricas.</p>
        )}
      </section>

      <div className="flex gap-2 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") search(); }}
          placeholder="ID, CPF, e-mail ou código do ingresso"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
        <button onClick={search} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Buscar
        </button>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      {!pending && term && tickets.length === 0 && !error && <p className="text-sm text-gray-500">Nenhum ingresso encontrado.</p>}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{ticket.championshipName}</h2>
                <p className="text-sm text-gray-500">{ticket.categoryName} · {ticket.id}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {ticket.paymentStatus}{ticket.checkedIn ? " · check-in feito" : ""}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {([1, 2] as const).map((slot) => {
                const name = slot === 1 ? ticket.buyerName : ticket.partnerName;
                const cpf = slot === 1 ? ticket.buyerCpf : ticket.partnerCpf;
                const email = slot === 1 ? ticket.buyerEmail : ticket.partnerEmail;
                const credential = ticket.credentials.find((item) => item.athleteSlot === slot);
                return (
                  <div key={slot} className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Atleta {slot}</p>
                    <p className="mt-1 font-medium text-gray-900">{name}</p>
                    <p className="text-sm text-gray-600">CPF {cpf}</p>
                    <p className="break-all text-sm text-gray-600">{email}</p>
                    <button
                      type="button"
                      onClick={() => { setEditing({ ticket, slot }); setNewEmail(email); setReason(""); setError(null); }}
                      className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Corrigir e-mail com suporte
                    </button>
                    {credential && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOperationError(null);
                            setCredentialOperation({ ticketId: ticket.id, credentialId: credential.id, slot, type: "resend" });
                            setOperationReason("");
                            setOperationConfirmation("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
                        >
                          <RotateCcw className="size-3.5" /> Reenviar
                        </button>
                        <button
                          type="button"
                          disabled={credential.checkedIn}
                          onClick={() => {
                            setOperationError(null);
                            setCredentialOperation({ ticketId: ticket.id, credentialId: credential.id, slot, type: "invalidate" });
                            setOperationReason("");
                            setOperationConfirmation("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <AlertTriangle className="size-3.5" /> Invalidar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCaseDraft({ ticketId: ticket.id, credentialId: credential.id }); setCaseType("outro"); setCaseSummary(""); }}
                          className="rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                        >
                          Abrir caso
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { loadLogs({ ticketId: ticket.id }); refreshOperations(ticket.id); }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <History className="size-4" /> Ver histórico deste ingresso
            </button>
          </article>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Inbox className="size-5 text-blue-600" /> Fila de casos
            </h2>
            <p className="mt-1 text-sm text-gray-500">Atendimento com estado, responsável e notas. Não anexe documentos completos.</p>
          </div>
          <button type="button" onClick={() => { setCaseDraft({}); setCaseType("outro"); setCaseSummary(""); }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
            Abrir caso geral
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {cases.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Nenhum caso registrado.</p>}
          {cases.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{item.summary}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.caseType.replaceAll("_", " ")} · {item.assignedLabel}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "resolvido" ? "bg-emerald-50 text-emerald-700" : item.status === "aguardando_prova" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
              <textarea
                value={caseNotes[item.id] ?? ""}
                onChange={(event) => setCaseNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                rows={2}
                maxLength={1000}
                placeholder="Nota mínima e auditável, sem documento sensível..."
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateCase(item, "aberto")} disabled={pending} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">Aberto</button>
                <button type="button" onClick={() => updateCase(item, "aguardando_prova")} disabled={pending} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Aguardando prova</button>
                <button type="button" onClick={() => updateCase(item, "resolvido")} disabled={pending} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Resolver</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldCheck className="size-5 text-blue-600" /> Histórico das credenciais
        </h2>
        <p className="mt-1 text-sm text-gray-500">Emissões, acessos, rotações, entregas e check-ins, sem exibir tokens.</p>
        <div className="mt-4 max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
          {credentialEvents.length === 0 && <p className="py-5 text-sm text-gray-500">Nenhum evento operacional encontrado.</p>}
          {credentialEvents.map((event) => (
            <article key={event.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{event.eventLabel}</p>
                <p className="text-xs text-gray-500">Atleta {event.athleteSlot ?? "—"} · {event.actorLabel}</p>
                <p className="mt-1 font-mono text-[10px] text-gray-400">{event.ticketId}</p>
              </div>
              <time className="shrink-0 text-xs text-gray-400" dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
              </time>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <History className="size-5 text-blue-600" /> Histórico de alterações
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {logsTicketId ? "Mostrando somente o ingresso selecionado. " : "Últimas 100 ações auditadas em ingressos. "}
              {(appliedDateFrom || appliedDateTo) && (
                <span>
                  Período: {appliedDateFrom ? formatDateKey(appliedDateFrom) : "início"} até {appliedDateTo ? formatDateKey(appliedDateTo) : "hoje"}.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {logsTicketId && (
              <button type="button" onClick={() => loadLogs({ ticketId: null })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                Mostrar todos
              </button>
            )}
            <button type="button" onClick={() => loadLogs()} disabled={logsPending} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60">
              <RefreshCcw className={`size-3.5 ${logsPending ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3">
          <label className="min-w-40 flex-1 text-xs font-medium text-gray-600">
            Data inicial
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="min-w-40 flex-1 text-xs font-medium text-gray-600">
            Data final
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </label>
          <button
            type="button"
            onClick={filterLogsByDate}
            disabled={logsPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Filtrar período
          </button>
          {(appliedDateFrom || appliedDateTo) && (
            <button
              type="button"
              onClick={clearDateFilter}
              disabled={logsPending}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              Limpar datas
            </button>
          )}
        </div>
        <div className="mt-4 divide-y divide-gray-100">
          {logs.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Nenhuma alteração auditada.</p>}
          {logs.map((log) => (
            <article key={log.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{log.actionLabel}</p>
                  <p className="text-sm text-gray-600">{log.ticketLabel}</p>
                </div>
                <time className="text-xs text-gray-400" dateTime={log.createdAt}>
                  {new Date(log.createdAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
                </time>
              </div>
              <p className="mt-2 text-sm text-gray-700"><span className="font-medium">Quem:</span> {log.actorLabel}</p>
              {log.athleteSlot && <p className="mt-1 text-sm text-gray-600">Atleta afetado: {log.athleteSlot}</p>}
              {log.fields.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  Campos: {log.fields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}
                </p>
              )}
              {(log.oldEmailMasked || log.newEmailMasked) && (
                <p className="mt-1 text-sm text-gray-600">
                  E-mail: {log.oldEmailMasked ?? "—"} → {log.newEmailMasked ?? "—"}
                </p>
              )}
              {log.reason && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"><span className="font-medium">Motivo:</span> {log.reason}</p>}
              {log.ticketId && <p className="mt-2 font-mono text-[11px] text-gray-400">{log.ticketId}</p>}
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Corrigir e-mail do atleta {editing.slot}</h2>
            <p className="mt-1 text-sm text-gray-500">{editing.slot === 1 ? editing.ticket.buyerName : editing.ticket.partnerName}</p>
            <label className="mt-5 block text-xs font-medium text-gray-600">Novo e-mail</label>
            <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <label className="mt-4 block text-xs font-medium text-gray-600">Motivo e validações realizadas</label>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={500} placeholder="Ex.: solicitante confirmou CPF, valor, data e comprovante do pagamento..." className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={saveEmail} disabled={pending} className="rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">Confirmar correção assistida</button>
              <button onClick={() => setEditing(null)} disabled={pending} className="rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {credentialOperation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {credentialOperation.type === "resend" ? "Reenviar credencial" : "Invalidar credencial comprometida"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Atleta {credentialOperation.slot}. A ação exige motivo e fica registrada.</p>
            {credentialOperation.type === "invalidate" && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                O link, QR e código atuais deixarão de funcionar imediatamente. O titular receberá uma nova emissão.
              </div>
            )}
            <label className="mt-5 block text-xs font-medium text-gray-600">Motivo e validações realizadas</label>
            <textarea value={operationReason} onChange={(event) => setOperationReason(event.target.value)} rows={4} maxLength={500} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            {credentialOperation.type === "invalidate" && (
              <>
                <label className="mt-4 block text-xs font-medium text-gray-600">Digite INVALIDAR para confirmar</label>
                <input value={operationConfirmation} onChange={(event) => setOperationConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-red-200 px-4 py-3 text-sm" />
              </>
            )}
            {operationError && (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {operationError}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={runCredentialOperation} disabled={pending} className={`rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 ${credentialOperation.type === "invalidate" ? "bg-red-600" : "bg-blue-600"}`}>
                {pending ? "Processando..." : credentialOperation.type === "invalidate" ? "Invalidar e emitir nova" : "Reenviar agora"}
              </button>
              <button
                onClick={() => {
                  setCredentialOperation(null);
                  setOperationError(null);
                }}
                disabled={pending}
                className="rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {caseDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Abrir caso de suporte</h2>
            <p className="mt-1 text-sm text-gray-500">Registre somente o necessário. Não cole documento completo, dados bancários ou token.</p>
            <label className="mt-5 block text-xs font-medium text-gray-600">Tipo</label>
            <select value={caseType} onChange={(event) => setCaseType(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm">
              <option value="correcao_email">Correção de e-mail</option>
              <option value="credencial_comprometida">Credencial comprometida</option>
              <option value="falha_email">Falha de e-mail</option>
              <option value="estorno_pix">Estorno Pix pendente</option>
              <option value="outro">Outro</option>
            </select>
            <label className="mt-4 block text-xs font-medium text-gray-600">Resumo</label>
            <textarea value={caseSummary} onChange={(event) => setCaseSummary(event.target.value)} rows={4} maxLength={500} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={createCase} disabled={pending} className="rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">Adicionar à fila</button>
              <button onClick={() => setCaseDraft(null)} disabled={pending} className="rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
