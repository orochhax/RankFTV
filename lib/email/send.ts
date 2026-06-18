"use server";

import { getResend, FROM } from "./resend";
import {
  conviteDuplaHtml,
  inscricaoConfirmadaHtml,
  conviteAceitoHtml,
  pagamentoConfirmadoHtml,
} from "./templates";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Não lança erro — e-mail é best-effort; nunca bloqueia o fluxo principal.
async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return; // sem chave → silencioso em dev
  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
  } catch {
    console.error("[email] falha ao enviar para", to);
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
