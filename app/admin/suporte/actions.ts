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
] as const;

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function listarLogsSuporte(ticketId?: string): Promise<{ ok: boolean; error?: string; logs?: SupportAuditLog[] }> {
  await requireCeo();
  if (ticketId && !/^[0-9a-f-]{36}$/i.test(ticketId)) return { ok: false, error: "Ingresso inválido." };
  const admin = createAdminClient();
  let query = admin
    .from("security_audit_log")
    .select("id, actor_id, acao, alvo_id, detalhes, created_at")
    .eq("alvo_tabela", "athlete_tickets")
    .in("acao", [...SUPPORT_AUDIT_ACTIONS])
    .order("created_at", { ascending: false })
    .limit(100);
  if (ticketId) query = query.eq("alvo_id", ticketId);
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
  const [{ data: championships }, { data: categories }] = await Promise.all([
    championshipIds.length
      ? admin.from("championships").select("id, nome").in("id", championshipIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? admin.from("championship_categories").select("id, nome").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
  ]);
  const championshipNames = new Map((championships ?? []).map((item) => [item.id, item.nome]));
  const categoryNames = new Map((categories ?? []).map((item) => [item.id, item.nome]));
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
