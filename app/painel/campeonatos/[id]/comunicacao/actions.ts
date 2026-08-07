"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM } from "@/lib/email/resend";
import { comunicadoHtml } from "@/lib/email/templates";
import { registrarAuditoria } from "@/lib/audit";

const LOTE_EMAIL = 50;

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

type Destinatario = {
  userId: string;
  email: string;
  nome: string;
};

const MAX_DESTINATARIOS = 2000;

/**
 * userIds: apenas os IDs selecionados pelo organizador na UI — email e nome
 * são sempre derivados no servidor a partir de quem realmente tem inscrição
 * paga neste campeonato, nunca do que o navegador mandar. Sem isso, dava pra
 * forjar {userId, email, nome} arbitrários e usar o Resend da plataforma
 * pra mandar e-mail (com o remetente/domínio da RankFTV) pra qualquer
 * endereço, além de criar notificação in-app pra qualquer user_id.
 */
export async function enviarComunicado(
  champId: string,
  titulo: string,
  mensagem: string,
  userIds: string[],
): Promise<{ ok: boolean; enviados: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, enviados: 0, error: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id, nome")
    .eq("id", champId)
    .maybeSingle();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, enviados: 0, error: "Sem permissão." };

  if (!titulo.trim()) return { ok: false, enviados: 0, error: "Informe o título." };
  if (!mensagem.trim()) return { ok: false, enviados: 0, error: "Informe a mensagem." };
  if (userIds.length === 0) return { ok: false, enviados: 0, error: "Selecione ao menos um destinatário." };

  const admin = createAdminClient();
  const idsSolicitados = [...new Set(userIds)].slice(0, MAX_DESTINATARIOS);
  const { data: eligibleRows, error: recipientsError } = await supabase.rpc(
    "organizer_championship_recipients",
    { p_championship_id: champId, p_user_ids: idsSolicitados }
  );
  if (recipientsError) {
    return { ok: false, enviados: 0, error: "Nao foi possivel validar os destinatarios." };
  }

  const destinatarios: Destinatario[] = ((eligibleRows ?? []) as Array<{
    user_id: string;
    email: string;
    nome: string;
  }>).map((recipient) => ({
    userId: recipient.user_id,
    email: recipient.email,
    nome: recipient.nome,
  }));

  if (destinatarios.length === 0) return { ok: false, enviados: 0, error: "Nenhum destinatário válido selecionado." };

  // Notificações in-app (bulk insert)
  const notifRows = destinatarios.map((d) => ({
    user_id: d.userId,
    championship_id: champId,
    tipo: "comunicado",
    titulo: titulo.trim(),
    mensagem: mensagem.trim(),
  }));
  await admin.from("notifications").insert(notifRows);

  // E-mails via Resend (best-effort, não bloqueia se falhar) — em lotes
  // sequenciais, não todos de uma vez, pra não estourar limite de conexões/
  // rate limit do provedor num comunicado grande.
  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    for (const lote of emLotes(destinatarios, LOTE_EMAIL)) {
      await Promise.allSettled(
        lote.map((d) =>
          resend.emails.send({
            from: FROM,
            to: d.email,
            subject: `${champ.nome} — ${titulo.trim()}`,
            html: comunicadoHtml({
              nomeAtleta: d.nome,
              nomeCampeonato: champ.nome,
              titulo: titulo.trim(),
              mensagem: mensagem.trim(),
            }),
          }),
        ),
      );
    }
  }

  await registrarAuditoria({
    actorId: user.id,
    acao: "comunicado_enviado",
    alvoTabela: "championships",
    alvoId: champId,
    detalhes: { titulo: titulo.trim(), destinatarios: destinatarios.length },
  });

  return { ok: true, enviados: destinatarios.length };
}
