"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import {
  buscarIngressosSuporte,
  corrigirEmailAtletaSuporte,
  type SupportTicket,
} from "@/app/admin/suporte/actions";

export function TicketSupportCenter() {
  const [term, setTerm] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ ticket: SupportTicket; slot: 1 | 2 } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

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
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

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
    </div>
  );
}
