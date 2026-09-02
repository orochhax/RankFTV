import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCpf } from "@/lib/cpf";
import { validaCPF } from "@/lib/validacao";
import { isValidAthleteName } from "@/lib/athlete-display-name";
import { gerarTicketAccessToken, normalizarTicketAccessToken } from "@/lib/ticket-access";
import { gerarCodigoOtp, hashCodigoOtp } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rate-limit";
import { enviarAvisoAlteracaoIngresso, enviarCodigoAlteracaoIngresso } from "@/lib/email/send";
import { deliverAthleteTicketCredentials } from "@/lib/athlete-ticket-delivery";
import { registrarAuditoria } from "@/lib/audit";
import { isParticipantCategoryConflict, participantCategoryConflictMessage } from "@/lib/participant-registration";

export type AthleteTicketChangeInput = {
  ticketId: string;
  accessToken: string;
  compradorNome: string;
  compradorCpf: string;
  compradorEmail: string;
  compradorZap: string;
  compradorGenero: string;
  parceiroNome: string;
  parceiroCpf: string;
  parceiroEmail: string;
  parceiroZap: string;
  parceiroGenero: string;
  usarMesmoEmail?: boolean;
};

type TicketSnapshot = {
  id: string;
  championship_id: string;
  category_id: string | null;
  status_pagamento: string;
  checked_in: boolean;
  comprador_nome: string;
  comprador_cpf: string;
  comprador_email: string;
  comprador_zap: string | null;
  comprador_genero: string | null;
  parceiro_nome: string;
  parceiro_cpf: string;
  parceiro_email: string | null;
  parceiro_zap: string | null;
  parceiro_genero: string | null;
};

type Context = {
  admin: SupabaseClient;
  ticket: TicketSnapshot;
  campeonato: { nome: string; data_inicio: string | null; usa_motor_categoria: boolean | null } | null;
  categoria: { genero: string; bracket_confirmed_at: string | null } | null;
};

const OTP_MINUTES = 10;

function normalize(input: AthleteTicketChangeInput): AthleteTicketChangeInput {
  const compradorEmail = input.compradorEmail.trim().toLowerCase();
  return {
    ...input,
    compradorNome: input.compradorNome.trim(),
    compradorCpf: normalizeCpf(input.compradorCpf),
    compradorEmail,
    compradorZap: input.compradorZap.replace(/\D/g, ""),
    parceiroNome: input.parceiroNome.trim(),
    parceiroCpf: normalizeCpf(input.parceiroCpf),
    parceiroEmail: (input.usarMesmoEmail ? compradorEmail : input.parceiroEmail).trim().toLowerCase(),
    parceiroZap: input.parceiroZap.replace(/\D/g, ""),
  };
}

function validate(input: AthleteTicketChangeInput): string | null {
  if (!isValidAthleteName(input.compradorNome)) return "Informe o nome completo do atleta 1.";
  if (!validaCPF(input.compradorCpf)) return "CPF do atleta 1 inválido.";
  if (!/^\S+@\S+\.\S+$/.test(input.compradorEmail)) return "E-mail do atleta 1 inválido.";
  if (!input.compradorZap) return "Informe o WhatsApp do atleta 1.";
  if (!["masculino", "feminino"].includes(input.compradorGenero)) return "Informe o gênero do atleta 1.";
  if (!isValidAthleteName(input.parceiroNome)) return "Informe o nome completo do atleta 2.";
  if (!validaCPF(input.parceiroCpf)) return "CPF do atleta 2 inválido.";
  if (input.parceiroCpf === input.compradorCpf) return "Os dois atletas precisam usar CPFs diferentes.";
  if (!/^\S+@\S+\.\S+$/.test(input.parceiroEmail)) return "E-mail do atleta 2 inválido.";
  if (input.parceiroEmail === input.compradorEmail && !input.usarMesmoEmail)
    return "Marque a opção de usar o mesmo e-mail para os dois atletas.";
  if (!input.parceiroZap) return "Informe o WhatsApp do atleta 2.";
  if (!["masculino", "feminino"].includes(input.parceiroGenero)) return "Informe o gênero do atleta 2.";
  return null;
}

function changedFields(ticket: TicketSnapshot, input: AthleteTicketChangeInput): string[] {
  const pairs: Array<[string, string, string]> = [
    ["comprador_nome", ticket.comprador_nome.trim(), input.compradorNome],
    ["comprador_cpf", normalizeCpf(ticket.comprador_cpf), input.compradorCpf],
    ["comprador_email", ticket.comprador_email.trim().toLowerCase(), input.compradorEmail],
    ["comprador_zap", (ticket.comprador_zap ?? "").replace(/\D/g, ""), input.compradorZap],
    ["comprador_genero", ticket.comprador_genero ?? "", input.compradorGenero],
    ["parceiro_nome", ticket.parceiro_nome.trim(), input.parceiroNome],
    ["parceiro_cpf", normalizeCpf(ticket.parceiro_cpf), input.parceiroCpf],
    ["parceiro_email", (ticket.parceiro_email ?? "").trim().toLowerCase(), input.parceiroEmail],
    ["parceiro_zap", (ticket.parceiro_zap ?? "").replace(/\D/g, ""), input.parceiroZap],
    ["parceiro_genero", ticket.parceiro_genero ?? "", input.parceiroGenero],
  ];
  return pairs.filter(([, before, after]) => before !== after).map(([field]) => field);
}

async function loadContext(ticketId: string, accessToken: string): Promise<
  | { ok: false; error: string }
  | { ok: true; context: Context }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, category_id, status_pagamento, checked_in, comprador_nome, comprador_cpf, comprador_email, comprador_zap, comprador_genero, parceiro_nome, parceiro_cpf, parceiro_email, parceiro_zap, parceiro_genero")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();
  const ticket = data as TicketSnapshot | null;
  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (!["pendente", "pago"].includes(ticket.status_pagamento))
    return { ok: false, error: "Esse ingresso não aceita mais alterações." };
  if (ticket.checked_in) return { ok: false, error: "Não é possível alterar os atletas depois do primeiro check-in." };

  const [{ data: championshipData }, categoryResult] = await Promise.all([
    admin.from("championships").select("nome, data_inicio, usa_motor_categoria").eq("id", ticket.championship_id).maybeSingle(),
    ticket.category_id
      ? admin.from("championship_categories").select("genero, bracket_confirmed_at").eq("id", ticket.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const campeonato = championshipData as Context["campeonato"];
  const categoria = categoryResult.data as Context["categoria"];
  const todayBahia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date());
  if (campeonato?.data_inicio && campeonato.data_inicio <= todayBahia)
    return { ok: false, error: "O evento já começou. Procure o suporte para analisar o caso." };
  if (categoria?.bracket_confirmed_at)
    return { ok: false, error: "O chaveamento desta categoria já foi confirmado. Procure o suporte." };
  return { ok: true, context: { admin, ticket, campeonato, categoria } };
}

function validateCompetition(context: Context, input: AthleteTicketChangeInput, fields: string[]): string | null {
  if (context.categoria?.genero && context.categoria.genero !== "mista") {
    if (input.compradorGenero !== context.categoria.genero || input.parceiroGenero !== context.categoria.genero)
      return "Os gêneros informados não correspondem à categoria.";
  }
  if (context.campeonato?.usa_motor_categoria && fields.some((field) => !field.endsWith("_zap")))
    return "Este campeonato usa avaliação de nível. Alterações de identidade precisam do suporte.";
  return null;
}

async function applyChange(context: Context, input: AthleteTicketChangeInput, fields: string[], source: string) {
  const ticket = context.ticket;
  const buyerIdentityChanged = fields.some((field) => ["comprador_cpf", "comprador_email"].includes(field));
  const partnerIdentityChanged = fields.some((field) => ["parceiro_cpf", "parceiro_email"].includes(field));
  const nextAccessToken = buyerIdentityChanged ? gerarTicketAccessToken() : input.accessToken;
  const { data, error } = await context.admin
    .from("athlete_tickets")
    .update({
      comprador_nome: input.compradorNome,
      comprador_cpf: input.compradorCpf,
      comprador_email: input.compradorEmail,
      comprador_zap: input.compradorZap,
      comprador_genero: input.compradorGenero,
      parceiro_nome: input.parceiroNome,
      parceiro_cpf: input.parceiroCpf,
      parceiro_email: input.parceiroEmail,
      parceiro_zap: input.parceiroZap,
      parceiro_genero: input.parceiroGenero,
      ...(buyerIdentityChanged ? { access_token: nextAccessToken, user_id: null } : {}),
      ...(partnerIdentityChanged ? { parceiro_user_id: null } : {}),
    })
    .eq("id", ticket.id)
    .eq("access_token", input.accessToken)
    .eq("checked_in", false)
    .in("status_pagamento", ["pendente", "pago"])
    .select("id")
    .maybeSingle();
  if (isParticipantCategoryConflict(error)) return { ok: false as const, error: participantCategoryConflictMessage };
  if (error || !data) return { ok: false as const, error: "O ingresso foi atualizado e a alteração não pôde ser concluída." };

  await registrarAuditoria({
    actorId: null,
    acao: "athlete_ticket_identity_changed",
    alvoTabela: "athlete_tickets",
    alvoId: ticket.id,
    detalhes: { origem: source, campos: fields },
  });
  if (ticket.status_pagamento === "pago") await deliverAthleteTicketCredentials(context.admin, ticket.id);
  const oldEmails = new Set([
    ticket.comprador_email.trim().toLowerCase(),
    fields.some((field) => field.startsWith("parceiro_")) ? ticket.parceiro_email?.trim().toLowerCase() : null,
  ].filter((email): email is string => Boolean(email)));
  await Promise.all([...oldEmails].map((email) => enviarAvisoAlteracaoIngresso({
    email,
    nomeCampeonato: context.campeonato?.nome ?? "seu campeonato",
    resumo: `Campos alterados: ${fields.join(", ")}.`,
  })));
  return { ok: true as const, accessToken: buyerIdentityChanged ? nextAccessToken : undefined };
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function requestAthleteTicketChange(inputRaw: AthleteTicketChangeInput, ip: string): Promise<
  | { ok: false; error: string }
  | { ok: true; completed: true; accessToken?: string }
  | { ok: true; completed: false; challengeId: string; requiresNewEmailCode: boolean; currentEmailMasked: string; newEmailMasked?: string }
> {
  const accessToken = normalizarTicketAccessToken(inputRaw.accessToken);
  if (!accessToken) return { ok: false, error: "Link do ingresso inválido." };
  const input = normalize({ ...inputRaw, accessToken });
  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };
  const loaded = await loadContext(input.ticketId, accessToken);
  if (!loaded.ok) return loaded;
  const fields = changedFields(loaded.context.ticket, input);
  if (fields.length === 0) return { ok: false, error: "Nenhum dado foi alterado." };
  const competitionError = validateCompetition(loaded.context, input, fields);
  if (competitionError) return { ok: false, error: competitionError };
  if (fields.every((field) => field.endsWith("_zap"))) {
    const result = await applyChange(loaded.context, input, fields, "link_whatsapp");
    return result.ok ? { ...result, completed: true } : result;
  }

  const [allowedTicket, allowedIp] = await Promise.all([
    checkRateLimit(`ticket-change:${loaded.context.ticket.id}`, 3, 900),
    checkRateLimit(`ticket-change-ip:${ip}`, 10, 3600),
  ]);
  if (!allowedTicket || !allowedIp) return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };

  const currentCode = gerarCodigoOtp();
  const buyerEmailChanged = loaded.context.ticket.comprador_email.trim().toLowerCase() !== input.compradorEmail;
  const newCode = buyerEmailChanged ? gerarCodigoOtp() : null;
  const { accessToken: _secret, ...requestedChanges } = input;
  void _secret;
  await loaded.context.admin.from("athlete_ticket_change_challenges")
    .delete()
    .eq("athlete_ticket_id", input.ticketId)
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
  await loaded.context.admin.from("athlete_ticket_change_challenges")
    .update({ used_at: new Date().toISOString() })
    .eq("athlete_ticket_id", input.ticketId)
    .is("used_at", null);
  const { data: challenge, error } = await loaded.context.admin
    .from("athlete_ticket_change_challenges")
    .insert({
      athlete_ticket_id: input.ticketId,
      requested_changes: requestedChanges,
      current_email: loaded.context.ticket.comprador_email.trim().toLowerCase(),
      new_buyer_email: buyerEmailChanged ? input.compradorEmail : null,
      current_code_hash: hashCodigoOtp(currentCode),
      new_email_code_hash: newCode ? hashCodigoOtp(newCode) : null,
      expires_at: new Date(Date.now() + OTP_MINUTES * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !challenge) return { ok: false, error: "A confirmação segura ainda não está disponível. Procure o suporte." };

  const currentSent = await enviarCodigoAlteracaoIngresso({
    email: loaded.context.ticket.comprador_email,
    codigo: currentCode,
    validadeMinutos: OTP_MINUTES,
    destino: "atual",
  });
  const newSent = !newCode || await enviarCodigoAlteracaoIngresso({
    email: input.compradorEmail,
    codigo: newCode,
    validadeMinutos: OTP_MINUTES,
    destino: "novo",
  });
  if (!currentSent || !newSent) {
    await loaded.context.admin.from("athlete_ticket_change_challenges").delete().eq("id", challenge.id);
    return { ok: false, error: "Não foi possível enviar o código agora. Tente novamente." };
  }
  return {
    ok: true,
    completed: false,
    challengeId: challenge.id,
    requiresNewEmailCode: buyerEmailChanged,
    currentEmailMasked: maskEmail(loaded.context.ticket.comprador_email),
    newEmailMasked: buyerEmailChanged ? maskEmail(input.compradorEmail) : undefined,
  };
}

export async function confirmAthleteTicketChange(input: {
  ticketId: string;
  accessToken: string;
  challengeId: string;
  currentEmailCode: string;
  newEmailCode?: string;
}) {
  const accessToken = normalizarTicketAccessToken(input.accessToken);
  if (!accessToken) return { ok: false as const, error: "Link do ingresso inválido." };
  const loaded = await loadContext(input.ticketId, accessToken);
  if (!loaded.ok) return loaded;
  const { data } = await loaded.context.admin
    .from("athlete_ticket_change_challenges")
    .select("id, requested_changes, new_email_code_hash, used_at, expires_at")
    .eq("id", input.challengeId)
    .eq("athlete_ticket_id", input.ticketId)
    .maybeSingle();
  const challenge = data as null | {
    id: string;
    requested_changes: Omit<AthleteTicketChangeInput, "accessToken">;
    new_email_code_hash: string | null;
    used_at: string | null;
    expires_at: string;
  };
  const now = new Date().toISOString();
  if (!challenge || challenge.used_at || challenge.expires_at <= now)
    return { ok: false as const, error: "A confirmação expirou. Solicite novos códigos." };
  const requested = normalize({ ...challenge.requested_changes, accessToken });
  const validationError = validate(requested);
  if (validationError) return { ok: false as const, error: validationError };
  const fields = changedFields(loaded.context.ticket, requested);
  if (fields.length === 0) return { ok: false as const, error: "Os dados já foram atualizados." };
  const competitionError = validateCompetition(loaded.context, requested, fields);
  if (competitionError) return { ok: false as const, error: competitionError };
  const { data: claimed, error: claimError } = await loaded.context.admin.rpc(
    "claim_athlete_ticket_change_challenge",
    {
      p_challenge_id: challenge.id,
      p_athlete_ticket_id: input.ticketId,
      p_current_code_hash: hashCodigoOtp(input.currentEmailCode.replace(/\D/g, "")),
      p_new_email_code_hash: challenge.new_email_code_hash
        ? hashCodigoOtp((input.newEmailCode ?? "").replace(/\D/g, ""))
        : null,
    },
  );
  if (claimError) return { ok: false as const, error: "Não foi possível validar os códigos agora." };
  if (!claimed) return { ok: false as const, error: "Código inválido, expirado ou já utilizado." };
  return applyChange(loaded.context, requested, fields, "link_otp");
}
