"use server";

import { getResend, FROM } from "./resend";
import {
  conviteDuplaHtml,
  inscricaoConfirmadaHtml,
  conviteAceitoHtml,
  pagamentoConfirmadoHtml,
  conviteStaffHtml,
  recuperacaoIngressoHtml,
  credencialAtletaHtml,
  alteracaoIngressoOtpHtml,
  avisoAlteracaoIngressoHtml,
} from "./templates";
import { reportOperationalEvent } from "@/lib/observability";
import { resolveBaseUrl } from "@/lib/site-url";
import { createEmailOperationalEvent, updateEmailOperationalEvent } from "@/lib/email/operations";

const BASE_URL = resolveBaseUrl(process.env.NEXT_PUBLIC_BASE_URL, "http://localhost:3000");

export async function enviarCodigoAlteracaoIngresso(opts: {
  email: string;
  codigo: string;
  validadeMinutos: number;
  destino: "atual" | "novo";
}): Promise<boolean> {
  return send(
    opts.email,
    "Confirme a alteração do seu ingresso",
    alteracaoIngressoOtpHtml(opts),
  );
}

export async function enviarAvisoAlteracaoIngresso(opts: {
  email: string;
  nomeCampeonato: string;
  resumo: string;
}): Promise<boolean> {
  return send(
    opts.email,
    `Dados do ingresso alterados — ${opts.nomeCampeonato}`,
    avisoAlteracaoIngressoHtml(opts),
  );
}

// Não lança erro — e-mail é best-effort; nunca bloqueia o fluxo principal.
async function send(
  to: string,
  subject: string,
  html: string,
  options?: { idempotencyKey?: string; templateKey?: string },
): Promise<boolean> {
  const eventId = await createEmailOperationalEvent({
    recipient: to,
    templateKey: options?.templateKey ?? "transactional",
  });
  if (!process.env.RESEND_API_KEY) {
    await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_not_configured" });
    return false;
  }
  try {
    const result = await getResend().emails.send(
      { from: FROM, to, subject, html },
      options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );
    if (result.error) {
      await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_rejected" });
      await reportOperationalEvent({
        level: "error",
        event: "email.delivery_failed",
        message: "Transactional email provider rejected delivery",
        context: { templateSubject: subject, providerError: result.error },
        alert: true,
      });
      return false;
    }
    await updateEmailOperationalEvent({
      id: eventId,
      status: "accepted",
      providerMessageId: result.data?.id,
    });
    return true;
  } catch (error) {
    await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_exception" });
    await reportOperationalEvent({
      level: "error",
      event: "email.delivery_failed",
      message: "Transactional email delivery failed",
      context: { templateSubject: subject },
      error,
      alert: true,
    });
    return false;
  }
}

export async function enviarConviteDupla(opts: {
  emailConvidado: string;
  nomeConvidado: string;
  nomeAtleta1: string;
  usernameAtleta1: string;
  nomeCampeonato: string;
  nomeCategoria: string;
}) {
  await send(
    opts.emailConvidado,
    `${opts.nomeAtleta1} te convidou para jogar no ${opts.nomeCampeonato}`,
    conviteDuplaHtml({
      ...opts,
      perfilUrl: `${BASE_URL}/perfil`,
    }),
  );
}

export async function enviarInscricaoConfirmada(opts: {
  emailAtleta: string;
  nomeAtleta: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  championshipId: string;
}) {
  await send(
    opts.emailAtleta,
    `Inscrição confirmada — ${opts.nomeCampeonato}`,
    inscricaoConfirmadaHtml({
      nomeAtleta: opts.nomeAtleta,
      nomeCampeonato: opts.nomeCampeonato,
      nomeCategoria: opts.nomeCategoria,
      inscricoesUrl: `${BASE_URL}/minhas-inscricoes/${opts.championshipId}`,
    }),
  );
}

export async function enviarConviteAceito(opts: {
  emailAtleta1: string;
  nomeAtleta1: string;
  nomeAtleta2: string;
  usernameAtleta2: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  championshipId: string;
}) {
  await send(
    opts.emailAtleta1,
    `${opts.nomeAtleta2} aceitou seu convite — ${opts.nomeCampeonato}`,
    conviteAceitoHtml({
      nomeAtleta1: opts.nomeAtleta1,
      nomeAtleta2: opts.nomeAtleta2,
      usernameAtleta2: opts.usernameAtleta2,
      nomeCampeonato: opts.nomeCampeonato,
      nomeCategoria: opts.nomeCategoria,
      inscricoesUrl: `${BASE_URL}/minhas-inscricoes/${opts.championshipId}`,
    }),
  );
}

export async function enviarConviteStaff(opts: {
  emailConvidado: string;
  nomeConvidado: string;
  nomeOrganizador: string;
  nomeCampeonato: string;
  permissoes: string;
}) {
  await send(
    opts.emailConvidado,
    `${opts.nomeOrganizador} te convidou para ser staff em ${opts.nomeCampeonato}`,
    conviteStaffHtml({
      nomeConvidado:    opts.nomeConvidado,
      nomeOrganizador:  opts.nomeOrganizador,
      nomeCampeonato:   opts.nomeCampeonato,
      permissoes:       opts.permissoes,
      notificacoesUrl:  `${BASE_URL}/notificacoes`,
    }),
  );
}

export async function enviarCodigoRecuperacaoIngresso(opts: {
  email: string;
  codigo: string;
  validadeMinutos: number;
}) {
  await send(
    opts.email,
    "Seu código de acesso — RankFTV",
    recuperacaoIngressoHtml({ codigo: opts.codigo, validadeMinutos: opts.validadeMinutos }),
  );
}

export async function enviarPagamentoConfirmado(opts: {
  emailAtleta: string;
  nomeAtleta: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  valorFormatado: string;
  championshipId: string;
}) {
  await send(
    opts.emailAtleta,
    `Pagamento confirmado — ${opts.nomeCampeonato}`,
    pagamentoConfirmadoHtml({
      nomeAtleta: opts.nomeAtleta,
      nomeCampeonato: opts.nomeCampeonato,
      nomeCategoria: opts.nomeCategoria,
      valorFormatado: opts.valorFormatado,
      inscricoesUrl: `${BASE_URL}/minhas-inscricoes/${opts.championshipId}`,
    }),
  );
}

export async function enviarCredencialAtleta(opts: {
  emailAtleta: string;
  nomeAtleta: string;
  nomeParceiro: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  credencialUrl: string;
  gerenciarCompraUrl?: string;
  idempotencyKey: string;
}): Promise<boolean> {
  return send(
    opts.emailAtleta,
    `Sua credencial — ${opts.nomeCampeonato}`,
    credencialAtletaHtml(opts),
    { idempotencyKey: opts.idempotencyKey, templateKey: "athlete_credential" },
  );
}
