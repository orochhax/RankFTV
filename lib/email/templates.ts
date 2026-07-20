// Templates de e-mail em HTML simples. Sem libs de template — só string pura.
// O estilo inline é necessário para compatibilidade com clientes de e-mail.
//
// Todo valor dinâmico (nome, título, mensagem — em especial o comunicado
// livre do organizador, que chega direto do formulário) tem que passar por
// escapeHtml antes de entrar no template. Sem isso, `titulo`/`mensagem` do
// comunicado viram injeção de HTML/phishing pra centenas de inscritos de
// uma vez só — e-mail renderiza HTML igual navegador.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function base(titulo: string, corpo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">
              Rank<span style="font-weight:400;">FTV</span>
            </span>
          </td>
        </tr>
        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${titulo}</h1>
            ${corpo}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Este e-mail foi enviado automaticamente pela plataforma RankFTV.
              Não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none;">${label}</a>`;
}

function p(text: string): string {
  return `<p style="margin:8px 0;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export function conviteDuplaHtml(opts: {
  nomeConvidado: string;
  nomeAtleta1: string;
  usernameAtleta1: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  perfilUrl: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeConvidado)}</strong>!`)}
    ${p(`<strong>@${escapeHtml(opts.usernameAtleta1)}</strong> te convidou para jogar como dupla no campeonato:`)}
    <div style="margin:16px 0;padding:16px;background:#eff6ff;border-radius:10px;border-left:4px solid #1d4ed8;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#1e3a8a;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
    </div>
    ${p("Acesse seu perfil para aceitar ou recusar o convite.")}
    ${btn("Ver convite no perfil", opts.perfilUrl)}
  `;
  return base("Convite de dupla recebido!", corpo);
}

export function inscricaoConfirmadaHtml(opts: {
  nomeAtleta: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  inscricoesUrl: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeAtleta)}</strong>!`)}
    ${p("Sua inscrição foi confirmada. Até o campeonato!")}
    <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
    </div>
    ${p("Sua credencial digital estará disponível no link abaixo.")}
    ${btn("Ver minha inscrição", opts.inscricoesUrl)}
  `;
  return base("Inscrição confirmada!", corpo);
}

export function conviteAceitoHtml(opts: {
  nomeAtleta1: string;
  nomeAtleta2: string;
  usernameAtleta2: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  inscricoesUrl: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeAtleta1)}</strong>!`)}
    ${p(`<strong>@${escapeHtml(opts.usernameAtleta2)}</strong> aceitou seu convite. A dupla está formada!`)}
    <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
    </div>
    ${btn("Ver minha inscrição", opts.inscricoesUrl)}
  `;
  return base("Dupla confirmada!", corpo);
}

export function conviteStaffHtml(opts: {
  nomeConvidado: string;
  nomeOrganizador: string;
  nomeCampeonato: string;
  permissoes: string;
  notificacoesUrl: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeConvidado)}</strong>!`)}
    ${p(`<strong>${escapeHtml(opts.nomeOrganizador)}</strong> te convidou para fazer parte da equipe de staff do campeonato:`)}
    <div style="margin:16px 0;padding:16px;background:#eff6ff;border-radius:10px;border-left:4px solid #1d4ed8;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#1e3a8a;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">Acesso: ${escapeHtml(opts.permissoes)}</p>
    </div>
    ${p("Acesse suas notificações para aceitar ou recusar o convite.")}
    ${btn("Ver convite", opts.notificacoesUrl)}
  `;
  return base("Você foi convidado para ser staff!", corpo);
}

export function pagamentoConfirmadoHtml(opts: {
  nomeAtleta: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  valorFormatado: string;
  inscricoesUrl: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeAtleta)}</strong>!`)}
    ${p("Recebemos seu pagamento. Você está oficialmente inscrito!")}
    <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Valor pago: ${escapeHtml(opts.valorFormatado)}</p>
    </div>
    ${btn("Ver minha credencial", opts.inscricoesUrl)}
  `;
  return base("Pagamento confirmado!", corpo);
}

export function comunicadoHtml(opts: {
  nomeAtleta: string;
  nomeCampeonato: string;
  titulo: string;
  mensagem: string;
}): string {
  const tituloSeguro = escapeHtml(opts.titulo);
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeAtleta)}</strong>!`)}
    ${p(`O organizador do <strong>${escapeHtml(opts.nomeCampeonato)}</strong> enviou um comunicado:`)}
    <div style="margin:16px 0;padding:20px;background:#eff6ff;border-radius:10px;border-left:4px solid #1d4ed8;">
      <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1e3a8a;">${tituloSeguro}</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-line;">${escapeHtml(opts.mensagem)}</p>
    </div>
  `;
  return base(tituloSeguro, corpo);
}

export function recuperacaoIngressoHtml(opts: {
  codigo: string;
  validadeMinutos: number;
}): string {
  const corpo = `
    ${p("Alguém pediu pra ver os ingressos ligados a este e-mail no RankFTV.")}
    <div style="margin:20px 0;padding:24px;background:#eff6ff;border-radius:10px;border-left:4px solid #1d4ed8;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#1e3a8a;">${escapeHtml(opts.codigo)}</p>
    </div>
    ${p(`Esse código vale por ${opts.validadeMinutos} minutos e só pode ser usado uma vez.`)}
    ${p("Se você não pediu isso, pode ignorar este e-mail — ninguém consegue ver seus ingressos sem esse código.")}
  `;
  return base("Seu código de acesso", corpo);
}
