"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { normalizeCpf } from "@/lib/cpf";
import { gerarTicketAccessToken } from "@/lib/ticket-access";
import { registrarAuditoria } from "@/lib/audit";
import { enviarAvisoAlteracaoIngresso } from "@/lib/email/send";
import { deliverAthleteTicketCredentials } from "@/lib/athlete-ticket-delivery";

export type SupportTicket = {
  id: string;
  championshipId: string;
  championshipName: string;
  categoryName: string;
  paymentStatus: string;
  checkedIn: boolean;
  buyerName: string;
  buyerCpf: string;
  buyerEmail: string;
  partnerName: string;
  partnerCpf: string;
  partnerEmail: string;
  createdAt: string;
  credentials: Array<{
    id: string;
    athleteSlot: 1 | 2;
    checkedIn: boolean;
    emailSentAt: string | null;
  }>;
};

export type SupportCredentialEvent = {
  id: string;
  ticketId: string;
  credentialId: string;
  athleteSlot: number | null;
  eventType: string;
  eventLabel: string;
  actorLabel: string;
  createdAt: string;
};

export type EmailOperationsSummary = {
  queued: number;
  accepted: number;
  delivered: number;
  failed: number;
  bounced: number;
  complained: number;
  averageDeliverySeconds: number | null;
  pendingCredentials: Array<{
    credentialId: string;
    ticketId: string;
    athleteSlot: 1 | 2;
    athleteName: string;
    championshipName: string;
    createdAt: string;
  }>;
  pendingPixRefunds: Array<{
    operationId: string;
    ticketId: string;
    amount: number | null;
    status: string;
    updatedAt: string;
  }>;
};

export type SupportCase = {
  id: string;
  ticketId: string | null;
  credentialId: string | null;
  caseType: string;
  status: "aberto" | "aguardando_prova" | "resolvido";
  summary: string;
  assignedLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportAuditLog = {
  id: string;
  action: string;
  actionLabel: string;
  actorLabel: string;
  ticketId: string | null;
  ticketLabel: string;
  createdAt: string;
  fields: string[];
  athleteSlot: number | null;
  reason: string | null;
  oldEmailMasked: string | null;
  newEmailMasked: string | null;
};

export type SupportAuditFilters = {
  ticketId?: string;
  dateFrom?: string;
  dateTo?: string;
};

async function requireCeo() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);
  if (!user || !isCeo(role)) throw new Error("Não autorizado.");
  return user;
}

const TICKET_SELECT = "id, championship_id, category_id, status_pagamento, checked_in, comprador_nome, comprador_cpf, comprador_email, parceiro_nome, parceiro_cpf, parceiro_email, created_at";

const SUPPORT_AUDIT_ACTIONS = [
  "athlete_ticket_identity_changed",
  "athlete_ticket_email_correction_requested",
  "athlete_ticket_email_corrected_by_support",
  "athlete_ticket_credential_resent_by_support",
  "athlete_ticket_credential_invalidated_by_support",
] as const;

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function nextDateKey(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

export async function listarLogsSuporte(filters: SupportAuditFilters = {}): Promise<{ ok: boolean; error?: string; logs?: SupportAuditLog[] }> {
  await requireCeo();
  const { ticketId, dateFrom, dateTo } = filters;
  if (ticketId && !/^[0-9a-f-]{36}$/i.test(ticketId)) return { ok: false, error: "Ingresso inválido." };
  if (dateFrom && !isValidDateKey(dateFrom)) return { ok: false, error: "Data inicial inválida." };
  if (dateTo && !isValidDateKey(dateTo)) return { ok: false, error: "Data final inválida." };
  if (dateFrom && dateTo && dateFrom > dateTo) return { ok: false, error: "A data inicial não pode ser posterior à data final." };
  const admin = createAdminClient();
  let query = admin
    .from("security_audit_log")
    .select("id, actor_id, acao, alvo_id, detalhes, created_at")
    .eq("alvo_tabela", "athlete_tickets")
    .in("acao", [...SUPPORT_AUDIT_ACTIONS])
    .order("created_at", { ascending: false })
    .limit(100);
  if (ticketId) query = query.eq("alvo_id", ticketId);
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00-03:00`);
  if (dateTo) query = query.lt("created_at", `${nextDateKey(dateTo)}T00:00:00-03:00`);
  const { data: rows, error } = await query;
  if (error) return { ok: false, error: "Não foi possível carregar o histórico." };

  const actorIds = [...new Set((rows ?? []).map((row) => row.actor_id).filter(Boolean))] as string[];
  const ticketIds = [...new Set((rows ?? []).map((row) => row.alvo_id).filter(Boolean))] as string[];
  const [{ data: actors }, { data: tickets }] = await Promise.all([
    actorIds.length
      ? admin.from("profiles").select("id, nome, username").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    ticketIds.length
      ? admin.from("athlete_tickets").select("id, comprador_nome, parceiro_nome").in("id", ticketIds)
      : Promise.resolve({ data: [] }),
  ]);
  const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor]));
  const ticketMap = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket]));
  const actionLabels: Record<string, string> = {
    athlete_ticket_identity_changed: "Dados alterados pelo comprador",
    athlete_ticket_email_correction_requested: "Correção assistida solicitada",
    athlete_ticket_email_corrected_by_support: "E-mail corrigido pelo suporte",
    athlete_ticket_credential_resent_by_support: "Credencial reenviada pelo suporte",
    athlete_ticket_credential_invalidated_by_support: "Credencial invalidada pelo suporte",
  };

  return {
    ok: true,
    logs: (rows ?? []).map((row) => {
      const details = (row.detalhes ?? {}) as Record<string, unknown>;
      const actor = row.actor_id ? actorMap.get(row.actor_id) : null;
      const origin = typeof details.origem === "string" ? details.origem : null;
      const ticket = row.alvo_id ? ticketMap.get(row.alvo_id) : null;
      return {
        id: row.id,
        action: row.acao,
        actionLabel: actionLabels[row.acao] ?? row.acao,
        actorLabel: actor
          ? `${actor.nome || actor.username || "CEO"}${actor.username ? ` (@${actor.username})` : ""}`
          : origin === "link_otp"
            ? "Comprador via link + OTP"
            : origin === "link_whatsapp"
              ? "Comprador via link gerencial"
              : "Sistema",
        ticketId: row.alvo_id,
        ticketLabel: ticket
          ? `${ticket.comprador_nome} + ${ticket.parceiro_nome}`
          : row.alvo_id
            ? `Ingresso ${row.alvo_id.slice(0, 8)}`
            : "Ingresso removido",
        createdAt: row.created_at,
        fields: Array.isArray(details.campos) ? details.campos.filter((field): field is string => typeof field === "string") : [],
        athleteSlot: typeof details.athlete_slot === "number" ? details.athlete_slot : null,
        reason: typeof details.motivo === "string" ? details.motivo : null,
        oldEmailMasked: typeof details.email_anterior === "string" ? details.email_anterior : null,
        newEmailMasked: typeof details.email_novo === "string" ? details.email_novo : null,
      };
    }),
  };
}

export async function buscarIngressosSuporte(termRaw: string): Promise<{ ok: boolean; error?: string; tickets?: SupportTicket[] }> {
  await requireCeo();
  const term = termRaw.trim();
  if (term.length < 3 || term.length > 150) return { ok: false, error: "Informe ID, CPF, e-mail ou código do ingresso." };
  const admin = createAdminClient();
  const cpf = normalizeCpf(term);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
  const email = term.includes("@") ? term.toLowerCase() : null;
  const queries = [];
  if (isUuid) queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("id", term).limit(20));
  if (cpf.length === 11) {
    queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("comprador_cpf", cpf).limit(20));
    queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("parceiro_cpf", cpf).limit(20));
  }
  if (email) {
    queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("comprador_email", email).limit(20));
    queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("parceiro_email", email).limit(20));
  }
  if (!isUuid && cpf.length !== 11 && !email) {
    queries.push(admin.from("athlete_tickets").select(TICKET_SELECT).eq("code", term.toUpperCase()).limit(20));
  }
  const results = await Promise.all(queries);
  if (results.some((result) => result.error)) return { ok: false, error: "Não foi possível consultar agora." };
  const rows = [...new Map(results.flatMap((result) => result.data ?? []).map((row) => [row.id, row])).values()].slice(0, 20);
  const championshipIds = [...new Set(rows.map((row) => row.championship_id))];
  const categoryIds = [...new Set(rows.map((row) => row.category_id).filter(Boolean))] as string[];
  const [{ data: championships }, { data: categories }, { data: credentials }] = await Promise.all([
    championshipIds.length
      ? admin.from("championships").select("id, nome").in("id", championshipIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? admin.from("championship_categories").select("id, nome").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    rows.length
      ? admin
          .from("athlete_ticket_credentials")
          .select("id, athlete_ticket_id, athlete_slot, checked_in, access_email_sent_at")
          .in("athlete_ticket_id", rows.map((row) => row.id))
          .order("athlete_slot")
      : Promise.resolve({ data: [] }),
  ]);
  const championshipNames = new Map((championships ?? []).map((item) => [item.id, item.nome]));
  const categoryNames = new Map((categories ?? []).map((item) => [item.id, item.nome]));
  const credentialsByTicket = new Map<string, SupportTicket["credentials"]>();
  for (const credential of credentials ?? []) {
    const current = credentialsByTicket.get(credential.athlete_ticket_id) ?? [];
    current.push({
      id: credential.id,
      athleteSlot: credential.athlete_slot as 1 | 2,
      checkedIn: Boolean(credential.checked_in),
      emailSentAt: credential.access_email_sent_at,
    });
    credentialsByTicket.set(credential.athlete_ticket_id, current);
  }
  return {
    ok: true,
    tickets: rows.map((row) => ({
      id: row.id,
      championshipId: row.championship_id,
      championshipName: championshipNames.get(row.championship_id) ?? "Campeonato",
      categoryName: row.category_id ? categoryNames.get(row.category_id) ?? "Categoria" : "Sem categoria",
      paymentStatus: row.status_pagamento,
      checkedIn: Boolean(row.checked_in),
      buyerName: row.comprador_nome,
      buyerCpf: row.comprador_cpf,
      buyerEmail: row.comprador_email,
      partnerName: row.parceiro_nome,
      partnerCpf: row.parceiro_cpf,
      partnerEmail: row.parceiro_email ?? "",
      createdAt: row.created_at,
      credentials: credentialsByTicket.get(row.id) ?? [],
    })),
  };
}

export async function corrigirEmailAtletaSuporte(input: {
  ticketId: string;
  athleteSlot: 1 | 2;
  newEmail: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireCeo();
  const newEmail = input.newEmail.trim().toLowerCase();
  const reason = input.reason.trim();
  if (!/^\S+@\S+\.\S+$/.test(newEmail)) return { ok: false, error: "Informe um e-mail válido." };
  if (reason.length < 15 || reason.length > 500) return { ok: false, error: "Registre um motivo com pelo menos 15 caracteres." };
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, category_id, status_pagamento, checked_in, comprador_email, parceiro_email")
    .eq("id", input.ticketId)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (!["pendente", "pago"].includes(ticket.status_pagamento)) return { ok: false, error: "Ingresso cancelado ou expirado." };
  if (ticket.checked_in) return { ok: false, error: "Correção bloqueada após o primeiro check-in." };
  const [{ data: championship }, categoryResult] = await Promise.all([
    admin.from("championships").select("nome, data_inicio").eq("id", ticket.championship_id).maybeSingle(),
    ticket.category_id
      ? admin.from("championship_categories").select("bracket_confirmed_at").eq("id", ticket.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const todayBahia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date());
  if (championship?.data_inicio && championship.data_inicio <= todayBahia)
    return { ok: false, error: "Correção bloqueada após o início do evento." };
  if ((categoryResult.data as { bracket_confirmed_at?: string | null } | null)?.bracket_confirmed_at)
    return { ok: false, error: "Correção bloqueada após a confirmação do chaveamento." };

  const oldEmail = (input.athleteSlot === 1 ? ticket.comprador_email : ticket.parceiro_email)?.trim().toLowerCase() ?? "";
  if (oldEmail === newEmail) return { ok: false, error: "O novo e-mail é igual ao atual." };
  const auditReady = await registrarAuditoria({
    actorId: actor.id,
    acao: "athlete_ticket_email_correction_requested",
    alvoTabela: "athlete_tickets",
    alvoId: ticket.id,
    detalhes: {
      athlete_slot: input.athleteSlot,
      motivo: reason,
      email_anterior: maskEmail(oldEmail),
      email_novo: maskEmail(newEmail),
    },
  });
  if (!auditReady) return { ok: false, error: "A auditoria está indisponível. Nenhum dado foi alterado." };
  const updates = input.athleteSlot === 1
    ? { comprador_email: newEmail, access_token: gerarTicketAccessToken(), user_id: null }
    : { parceiro_email: newEmail, parceiro_user_id: null };
  const { data: updated, error } = await admin
    .from("athlete_tickets")
    .update(updates)
    .eq("id", ticket.id)
    .eq("checked_in", false)
    .in("status_pagamento", ["pendente", "pago"])
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: "Não foi possível corrigir o e-mail." };

  await registrarAuditoria({
    actorId: actor.id,
    acao: "athlete_ticket_email_corrected_by_support",
    alvoTabela: "athlete_tickets",
    alvoId: ticket.id,
    detalhes: {
      athlete_slot: input.athleteSlot,
      motivo: reason,
      email_anterior: maskEmail(oldEmail),
      email_novo: maskEmail(newEmail),
    },
  });
  if (ticket.status_pagamento === "pago") await deliverAthleteTicketCredentials(admin, ticket.id);
  if (oldEmail) await enviarAvisoAlteracaoIngresso({
    email: oldEmail,
    nomeCampeonato: championship?.nome ?? "seu campeonato",
    resumo: `O e-mail do atleta ${input.athleteSlot} foi corrigido pelo suporte após validação assistida.`,
  });
  return { ok: true };
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function loadSupportCredential(ticketId: string, credentialId: string) {
  const admin = createAdminClient();
  const [{ data: ticket }, { data: credential }] = await Promise.all([
    admin
      .from("athlete_tickets")
      .select("id, championship_id, status_pagamento, checked_in, comprador_nome, comprador_email, parceiro_nome, parceiro_email")
      .eq("id", ticketId)
      .maybeSingle(),
    admin
      .from("athlete_ticket_credentials")
      .select("id, athlete_ticket_id, athlete_slot, checked_in")
      .eq("id", credentialId)
      .eq("athlete_ticket_id", ticketId)
      .maybeSingle(),
  ]);
  return { admin, ticket, credential };
}

export async function reenviarCredencialSuporte(input: {
  ticketId: string;
  credentialId: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireCeo();
  const reason = input.reason.trim();
  if (!validUuid(input.ticketId) || !validUuid(input.credentialId)) return { ok: false, error: "Credencial inválida." };
  if (reason.length < 15 || reason.length > 500) return { ok: false, error: "Registre um motivo com pelo menos 15 caracteres." };
  const { admin, ticket, credential } = await loadSupportCredential(input.ticketId, input.credentialId);
  if (!ticket || !credential) return { ok: false, error: "Credencial não encontrada." };
  if (ticket.status_pagamento !== "pago") return { ok: false, error: "Somente credenciais pagas podem ser reenviadas." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: rateError } = await admin
    .from("athlete_ticket_credential_events")
    .select("id", { count: "exact", head: true })
    .eq("credential_id", credential.id)
    .eq("event_type", "resend_requested")
    .gte("created_at", since);
  if (rateError) return { ok: false, error: "A trilha operacional está indisponível. Nenhum reenvio foi feito." };
  if ((count ?? 0) >= 3) return { ok: false, error: "Limite de 3 reenvios em 24 horas atingido." };

  const auditReady = await registrarAuditoria({
    actorId: actor.id,
    acao: "athlete_ticket_credential_resent_by_support",
    alvoTabela: "athlete_tickets",
    alvoId: ticket.id,
    detalhes: { athlete_slot: credential.athlete_slot, motivo: reason },
  });
  if (!auditReady) return { ok: false, error: "A auditoria está indisponível. Nenhum reenvio foi feito." };

  await admin.from("athlete_ticket_credential_events").insert({
    credential_id: credential.id,
    athlete_ticket_id: ticket.id,
    championship_id: ticket.championship_id,
    event_type: "resend_requested",
    actor_id: actor.id,
    details: { athlete_slot: credential.athlete_slot, reason },
  });
  const { error: resetError } = await admin
    .from("athlete_ticket_credentials")
    .update({ access_email_sent_at: null, access_email_claimed_at: null, updated_at: new Date().toISOString() })
    .eq("id", credential.id)
    .eq("athlete_ticket_id", ticket.id);
  if (resetError) return { ok: false, error: "Não foi possível preparar o reenvio." };
  const delivery = await deliverAthleteTicketCredentials(admin, ticket.id);
  if (delivery.sent < 1) return { ok: false, error: "A entrega não foi aceita. Ela permaneceu na fila para nova tentativa." };
  return { ok: true };
}

export async function invalidarCredencialSuporte(input: {
  ticketId: string;
  credentialId: string;
  reason: string;
  confirmation: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireCeo();
  const reason = input.reason.trim();
  if (input.confirmation.trim().toUpperCase() !== "INVALIDAR") return { ok: false, error: "Digite INVALIDAR para confirmar." };
  if (!validUuid(input.ticketId) || !validUuid(input.credentialId)) return { ok: false, error: "Credencial inválida." };
  if (reason.length < 15 || reason.length > 500) return { ok: false, error: "Registre um motivo com pelo menos 15 caracteres." };
  const { admin, ticket, credential } = await loadSupportCredential(input.ticketId, input.credentialId);
  if (!ticket || !credential) return { ok: false, error: "Credencial não encontrada." };
  if (ticket.status_pagamento !== "pago") return { ok: false, error: "A credencial não está ativa." };
  if (ticket.checked_in || credential.checked_in) return { ok: false, error: "Invalidação bloqueada após o check-in." };

  const { error: eventStoreError } = await admin
    .from("athlete_ticket_credential_events")
    .select("id")
    .eq("credential_id", credential.id)
    .limit(1);
  if (eventStoreError) return { ok: false, error: "A trilha operacional está indisponível. A credencial não foi alterada." };

  const auditReady = await registrarAuditoria({
    actorId: actor.id,
    acao: "athlete_ticket_credential_invalidated_by_support",
    alvoTabela: "athlete_tickets",
    alvoId: ticket.id,
    detalhes: { athlete_slot: credential.athlete_slot, motivo: reason },
  });
  if (!auditReady) return { ok: false, error: "A auditoria está indisponível. A credencial não foi alterada." };

  const { error: rotateError } = await admin
    .from("athlete_ticket_credentials")
    .update({
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      code: `A${credential.athlete_slot}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      access_email_sent_at: null,
      access_email_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credential.id)
    .eq("athlete_ticket_id", ticket.id)
    .eq("checked_in", false);
  if (rotateError) return { ok: false, error: "Não foi possível invalidar a credencial." };

  await admin.from("athlete_ticket_credential_events").insert({
    credential_id: credential.id,
    athlete_ticket_id: ticket.id,
    championship_id: ticket.championship_id,
    event_type: "invalidated",
    actor_id: actor.id,
    details: { athlete_slot: credential.athlete_slot, reason },
  });
  const email = credential.athlete_slot === 1 ? ticket.comprador_email : ticket.parceiro_email;
  const { data: championship } = await admin.from("championships").select("nome").eq("id", ticket.championship_id).maybeSingle();
  if (email) await enviarAvisoAlteracaoIngresso({
    email,
    nomeCampeonato: championship?.nome ?? "seu campeonato",
    resumo: `A credencial do atleta ${credential.athlete_slot} foi invalidada pelo suporte. Um novo link foi emitido.`,
  });
  const delivery = await deliverAthleteTicketCredentials(admin, ticket.id);
  if (delivery.sent < 1) return { ok: true };
  return { ok: true };
}

export async function listarEventosCredenciaisSuporte(ticketId?: string): Promise<{
  ok: boolean;
  error?: string;
  events?: SupportCredentialEvent[];
}> {
  await requireCeo();
  if (ticketId && !validUuid(ticketId)) return { ok: false, error: "Ingresso inválido." };
  const admin = createAdminClient();
  let query = admin
    .from("athlete_ticket_credential_events")
    .select("id, credential_id, athlete_ticket_id, event_type, actor_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (ticketId) query = query.eq("athlete_ticket_id", ticketId);
  const { data: rows, error } = await query;
  if (error) return { ok: false, error: "Não foi possível carregar os eventos das credenciais." };
  const actorIds = [...new Set((rows ?? []).map((row) => row.actor_id).filter(Boolean))] as string[];
  const credentialIds = [...new Set((rows ?? []).map((row) => row.credential_id))];
  const [{ data: actors }, { data: credentials }] = await Promise.all([
    actorIds.length ? admin.from("profiles").select("id, nome, username").in("id", actorIds) : Promise.resolve({ data: [] }),
    credentialIds.length ? admin.from("athlete_ticket_credentials").select("id, athlete_slot").in("id", credentialIds) : Promise.resolve({ data: [] }),
  ]);
  const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor.nome || actor.username || "CEO"]));
  const slotMap = new Map((credentials ?? []).map((credential) => [credential.id, credential.athlete_slot]));
  const labels: Record<string, string> = {
    issued: "Credencial emitida", rotated: "Links e QR substituídos", viewed: "Credencial acessada",
    email_sent: "E-mail enviado", email_failed: "Falha no envio", resend_requested: "Reenvio solicitado",
    invalidated: "Invalidação emergencial", checked_in: "Check-in realizado",
  };
  return {
    ok: true,
    events: (rows ?? []).map((row) => ({
      id: row.id,
      ticketId: row.athlete_ticket_id,
      credentialId: row.credential_id,
      athleteSlot: slotMap.get(row.credential_id) ?? (row.details as { athlete_slot?: number } | null)?.athlete_slot ?? null,
      eventType: row.event_type,
      eventLabel: labels[row.event_type] ?? row.event_type,
      actorLabel: row.actor_id ? actorMap.get(row.actor_id) ?? "Usuário autorizado" : "Sistema",
      createdAt: row.created_at,
    })),
  };
}

export async function listarOperacaoEmails(): Promise<{ ok: boolean; error?: string; summary?: EmailOperationsSummary }> {
  await requireCeo();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: emails, error: emailError },
    { data: pending, error: pendingError },
    { data: pendingRefunds, error: refundError },
  ] = await Promise.all([
    admin
      .from("transactional_email_events")
      .select("status, requested_at, delivered_at")
      .gte("requested_at", since)
      .order("requested_at", { ascending: false })
      .limit(5000),
    admin
      .from("athlete_ticket_credentials")
      .select("id, athlete_ticket_id, athlete_slot, display_name_snapshot, created_at")
      .is("access_email_sent_at", null)
      .order("created_at")
      .limit(50),
    admin
      .from("financial_operations")
      .select("id, record_id, amount, status, updated_at")
      .eq("flow", "athlete_ticket")
      .eq("operation_type", "refund")
      .eq("billing_type", "PIX")
      .in("status", ["processing", "provider_created", "ambiguous", "failed"])
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);
  if (emailError || pendingError || refundError) return { ok: false, error: "A operação de suporte ainda não está disponível." };
  const pendingRows = pending ?? [];
  const ticketIds = [...new Set(pendingRows.map((row) => row.athlete_ticket_id))];
  const { data: tickets } = ticketIds.length
    ? await admin.from("athlete_tickets").select("id, championship_id, status_pagamento").in("id", ticketIds).eq("status_pagamento", "pago")
    : { data: [] };
  const paidTicketMap = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket]));
  const championshipIds = [...new Set((tickets ?? []).map((ticket) => ticket.championship_id))];
  const { data: championships } = championshipIds.length
    ? await admin.from("championships").select("id, nome").in("id", championshipIds)
    : { data: [] };
  const championshipMap = new Map((championships ?? []).map((item) => [item.id, item.nome]));
  const rows = emails ?? [];
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  const deliveryDurations = rows
    .filter((row) => row.delivered_at)
    .map((row) => (Date.parse(row.delivered_at!) - Date.parse(row.requested_at)) / 1000)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return {
    ok: true,
    summary: {
      queued: count("queued"), accepted: count("accepted"), delivered: count("delivered"),
      failed: count("failed") + count("suppressed"), bounced: count("bounced"), complained: count("complained"),
      averageDeliverySeconds: deliveryDurations.length
        ? Math.round(deliveryDurations.reduce((sum, value) => sum + value, 0) / deliveryDurations.length)
        : null,
      pendingCredentials: pendingRows.flatMap((row) => {
        const ticket = paidTicketMap.get(row.athlete_ticket_id);
        if (!ticket) return [];
        return [{
          credentialId: row.id,
          ticketId: row.athlete_ticket_id,
          athleteSlot: row.athlete_slot as 1 | 2,
          athleteName: row.display_name_snapshot,
          championshipName: championshipMap.get(ticket.championship_id) ?? "Campeonato",
          createdAt: row.created_at,
        }];
      }),
      pendingPixRefunds: (pendingRefunds ?? []).map((operation) => ({
        operationId: operation.id,
        ticketId: operation.record_id,
        amount: operation.amount == null ? null : Number(operation.amount),
        status: operation.status,
        updatedAt: operation.updated_at,
      })),
    },
  };
}

export async function listarCasosSuporte(): Promise<{ ok: boolean; error?: string; cases?: SupportCase[] }> {
  await requireCeo();
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("support_cases")
    .select("id, athlete_ticket_id, credential_id, case_type, status, summary, assigned_to, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, error: "A fila de suporte ainda não está disponível." };
  const actorIds = [...new Set((rows ?? []).map((row) => row.assigned_to).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await admin.from("profiles").select("id, nome, username").in("id", actorIds)
    : { data: [] };
  const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor.nome || actor.username || "CEO"]));
  return {
    ok: true,
    cases: (rows ?? []).map((row) => ({
      id: row.id,
      ticketId: row.athlete_ticket_id,
      credentialId: row.credential_id,
      caseType: row.case_type,
      status: row.status,
      summary: row.summary,
      assignedLabel: row.assigned_to ? actorMap.get(row.assigned_to) ?? "CEO" : "Sem responsável",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function criarCasoSuporte(input: {
  ticketId?: string;
  credentialId?: string;
  caseType: string;
  summary: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireCeo();
  const summary = input.summary.trim();
  if (summary.length < 10 || summary.length > 500) return { ok: false, error: "Resuma o caso em 10 a 500 caracteres." };
  if (input.ticketId && !validUuid(input.ticketId)) return { ok: false, error: "Ingresso inválido." };
  if (input.credentialId && !validUuid(input.credentialId)) return { ok: false, error: "Credencial inválida." };
  const allowedTypes = ["correcao_email", "credencial_comprometida", "falha_email", "estorno_pix", "outro"];
  if (!allowedTypes.includes(input.caseType)) return { ok: false, error: "Tipo de caso inválido." };
  const { error } = await createAdminClient().from("support_cases").insert({
    athlete_ticket_id: input.ticketId ?? null,
    credential_id: input.credentialId ?? null,
    case_type: input.caseType,
    summary,
    assigned_to: actor.id,
    created_by: actor.id,
  });
  return error ? { ok: false, error: "Não foi possível abrir o caso." } : { ok: true };
}

export async function atualizarCasoSuporte(input: {
  caseId: string;
  status: "aberto" | "aguardando_prova" | "resolvido";
  note: string;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireCeo();
  const note = input.note.trim();
  if (!validUuid(input.caseId)) return { ok: false, error: "Caso inválido." };
  if (note.length < 3 || note.length > 1000) return { ok: false, error: "Registre uma nota de 3 a 1000 caracteres." };
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("support_cases")
    .update({ status: input.status, assigned_to: actor.id, resolved_at: input.status === "resolvido" ? now : null, updated_at: now })
    .eq("id", input.caseId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: "Não foi possível atualizar o caso." };
  const { error: noteError } = await admin.from("support_case_notes").insert({ case_id: input.caseId, author_id: actor.id, note });
  return noteError ? { ok: false, error: "O estado mudou, mas a nota não foi registrada." } : { ok: true };
}
