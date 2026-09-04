import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM } from "@/lib/email/resend";
import { comunicadoHtml } from "@/lib/email/templates";
import { buildChampionshipChangeNotice } from "@/lib/championship-notices-core";

export async function publishChampionshipChangeNotice(input: {
  championshipId: string;
  championshipName: string;
  actorId: string;
  notice: NonNullable<ReturnType<typeof buildChampionshipChangeNotice>>;
  authenticatedRecipients: Array<{ email: string; nome: string }>;
}) {
  const admin = createAdminClient();
  await admin.from("championship_notices").insert({ championship_id: input.championshipId, created_by: input.actorId, ...input.notice });
  if (!process.env.RESEND_API_KEY) return;
  const { data: guestTickets } = await admin.from("athlete_tickets").select("comprador_email, comprador_nome, parceiro_email, parceiro_nome").eq("championship_id", input.championshipId).eq("status_pagamento", "pago");
  const recipients = new Map<string, string>();
  for (const recipient of input.authenticatedRecipients) recipients.set(recipient.email.trim().toLowerCase(), recipient.nome);
  for (const ticket of guestTickets ?? []) {
    if (ticket.comprador_email) recipients.set(ticket.comprador_email.trim().toLowerCase(), ticket.comprador_nome);
    if (ticket.parceiro_email) recipients.set(ticket.parceiro_email.trim().toLowerCase(), ticket.parceiro_nome);
  }
  const resend = getResend();
  for (const [email, name] of recipients) {
    await resend.emails.send({ from: FROM, to: email, subject: `${input.championshipName} — ${input.notice.title}`, html: comunicadoHtml({ nomeAtleta: name, nomeCampeonato: input.championshipName, titulo: input.notice.title, mensagem: input.notice.message }) }).catch(() => undefined);
  }
}
