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
<body style="margin:0;padding:0;background:#FBE9D1;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBE9D1;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5CFAF;">
        <!-- Header -->
        <tr>
          <td style="background:#0E4937;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">
              Rank<span style="font-weight:700;color:#72BF00;">FTV</span>
            </span>
          </td>
        </tr>
        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0E4937;">${titulo}</h1>
            ${corpo}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#FFF8EE;border-top:1px solid #E5CFAF;">
            <p style="margin:0;font-size:11px;color:#3E685A;">
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
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#FF5D00;color:#ffffff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function p(text: string): string {
  return `<p style="margin:8px 0;font-size:15px;color:#0E4937;line-height:1.6;">${text}</p>`;
}

export function conviteListaEsperaHtml(opts: { championshipName: string; categoryName: string; url: string; hours: number }): string {
  return base("Uma vaga ficou disponível", `
    ${p(`Há uma vaga disponível em <strong>${escapeHtml(opts.championshipName)}</strong>.`)}
    ${p(`Categoria: <strong>${escapeHtml(opts.categoryName)}</strong>. Seu convite é pessoal e expira em ${opts.hours} horas.`)}
    ${btn("Continuar inscrição", opts.url)}
  `);
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
    <div style="margin:16px 0;padding:16px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#0E4937;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#B84300;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
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
    <div style="margin:16px 0;padding:16px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#0E4937;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#B84300;">Acesso: ${escapeHtml(opts.permissoes)}</p>
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

export function organizerFinancialNotificationHtml(opts: {
  nomeOrganizador: string;
  nomeCampeonato: string;
  heading: string;
  detail: string;
  valorFormatado?: string | null;
  nomeCategoria?: string | null;
  formaPagamento?: string | null;
  participantes?: string[];
}): string {
  const participantes = opts.participantes?.filter(Boolean) ?? [];
  return base(escapeHtml(opts.heading), `
    ${p(`Olá, <strong>${escapeHtml(opts.nomeOrganizador)}</strong>.`)}
    ${p(escapeHtml(opts.detail))}
    <div style="margin:16px 0;padding:16px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#0E4937;">${escapeHtml(opts.nomeCampeonato)}</p>
      ${opts.nomeCategoria ? `<p style="margin:4px 0 0;font-size:13px;color:#B84300;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>` : ""}
      ${opts.formaPagamento ? `<p style="margin:4px 0 0;font-size:13px;color:#B84300;">Forma de pagamento: ${escapeHtml(opts.formaPagamento)}</p>` : ""}
      ${opts.valorFormatado ? `<p style="margin:4px 0 0;font-size:13px;color:#B84300;">Valor: ${escapeHtml(opts.valorFormatado)}</p>` : ""}
      ${participantes.length ? `<p style="margin:4px 0 0;font-size:13px;color:#B84300;">${participantes.length === 1 ? "Participante" : "Atletas"}: ${participantes.map(escapeHtml).join(" + ")}</p>` : ""}
    </div>
  `);
}

export function credencialAtletaHtml(opts: {
  nomeAtleta: string;
  nomeParceiro: string;
  nomeCampeonato: string;
  nomeCategoria: string;
  credencialUrl: string;
  gerenciarCompraUrl?: string;
}): string {
  const corpo = `
    ${p(`Oi, <strong>${escapeHtml(opts.nomeAtleta)}</strong>!`)}
    ${p("O pagamento da dupla foi confirmado e sua credencial individual já está disponível.")}
    <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${escapeHtml(opts.nomeCampeonato)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Categoria: ${escapeHtml(opts.nomeCategoria)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Dupla: ${escapeHtml(opts.nomeAtleta)} + ${escapeHtml(opts.nomeParceiro)}</p>
    </div>
    ${p("O botão abaixo abre somente o seu QR Code. Seu parceiro receberá um link diferente no e-mail dele.")}
    ${p("Não encaminhe este link: quem tiver acesso a ele poderá visualizar a sua credencial.")}
    ${btn("Abrir minha credencial", opts.credencialUrl)}
    ${opts.gerenciarCompraUrl
      ? `${p("Como comprador, você também pode acompanhar o pagamento, corrigir os dados da dupla ou solicitar cancelamento pelo link gerencial.")}${btn("Gerenciar esta compra", opts.gerenciarCompraUrl)}`
      : ""}
  `;
  return base("Sua credencial individual chegou!", corpo);
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
    <div style="margin:16px 0;padding:20px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;">
      <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0E4937;">${tituloSeguro}</p>
      <p style="margin:0;font-size:14px;color:#3E685A;line-height:1.7;white-space:pre-line;">${escapeHtml(opts.mensagem)}</p>
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
    <div style="margin:20px 0;padding:24px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#0E4937;">${escapeHtml(opts.codigo)}</p>
    </div>
    ${p(`Esse código vale por ${opts.validadeMinutos} minutos e só pode ser usado uma vez.`)}
    ${p("Se você não pediu isso, pode ignorar este e-mail — ninguém consegue ver seus ingressos sem esse código.")}
  `;
  return base("Seu código de acesso", corpo);
}

export function alteracaoIngressoOtpHtml(opts: {
  codigo: string;
  validadeMinutos: number;
  destino: "atual" | "novo";
}): string {
  const explicacao = opts.destino === "novo"
    ? "Use este código para confirmar que o novo e-mail informado pertence a você."
    : "Use este código para autorizar a alteração dos dados da sua dupla.";
  const corpo = `
    ${p(explicacao)}
    <div style="margin:20px 0;padding:24px;background:#FFF0E6;border-radius:10px;border-left:4px solid #FF5D00;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#0E4937;">${escapeHtml(opts.codigo)}</p>
    </div>
    ${p(`O código vale por ${opts.validadeMinutos} minutos e só pode ser usado uma vez.`)}
    ${p("Se você não pediu essa alteração, não compartilhe o código e ignore este e-mail.")}
  `;
  return base("Confirme a alteração do ingresso", corpo);
}

export function avisoAlteracaoIngressoHtml(opts: {
  nomeCampeonato: string;
  resumo: string;
}): string {
  const corpo = `
    ${p(`Os dados de uma dupla no campeonato <strong>${escapeHtml(opts.nomeCampeonato)}</strong> foram alterados.`)}
    <div style="margin:16px 0;padding:16px;background:#fff7ed;border-radius:10px;border-left:4px solid #ea580c;">
      <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;">${escapeHtml(opts.resumo)}</p>
    </div>
    ${p("Links, códigos e QR Codes afetados foram substituídos. Se você não reconhece essa alteração, procure o suporte oficial do RankFTV.")}
  `;
  return base("Dados do ingresso alterados", corpo);
}

export function lembreteDespesaHtml(opts: {
  nomeOrganizador: string;
  nomeCampeonato: string;
  nomeDespesa: string;
  categoria: string;
  valorFormatado: string;
  dataVencimentoFormatada: string;
  diasRestantes: number;
  painelUrl: string;
}): string {
  const prazoTexto = opts.diasRestantes === 0
    ? "Vence hoje!"
    : opts.diasRestantes === 1
      ? "Vence amanhã!"
      : `Vence em ${opts.diasRestantes} dias`;

  const corpo = `
    ${p(`Olá, <strong>${escapeHtml(opts.nomeOrganizador)}</strong>!`)}
    ${p(`Este é um lembrete do RankFTV sobre uma despesa operacional do seu campeonato <strong>${escapeHtml(opts.nomeCampeonato)}</strong>:`)}
    <div style="margin:20px 0;padding:20px;background:#fef3c7;border-radius:12px;border:1px solid #fde68a;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">${prazoTexto}</p>
      <p style="margin:6px 0 2px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(opts.nomeDespesa)}</p>
      <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Categoria: ${escapeHtml(opts.categoria)} · Vencimento: ${escapeHtml(opts.dataVencimentoFormatada)}</p>
      <p style="margin:0;font-size:22px;font-weight:900;color:#b45309;">${escapeHtml(opts.valorFormatado)}</p>
    </div>
    ${p("Acesse o painel para acompanhar o saldo disponível na carteira e dar baixa nesta despesa após realizar o pagamento.")}
    <div style="margin:24px 0;">
      <a href="${escapeHtml(opts.painelUrl)}" style="display:inline-block;background:#FF5D00;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">
        Abrir Painel de Despesas
      </a>
    </div>
  `;
  return base("Lembrete de despesa a vencer", corpo);
}

