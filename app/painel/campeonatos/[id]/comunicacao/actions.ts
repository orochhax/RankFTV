"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM } from "@/lib/email/resend";
import { comunicadoHtml } from "@/lib/email/templates";

type Destinatario = {
  userId: string;
  email: string;
  nome: string;
};

export async function enviarComunicado(
  champId: string,
  titulo: string,
  mensagem: string,
  destinatarios: Destinatario[],
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
  if (destinatarios.length === 0) return { ok: false, enviados: 0, error: "Selecione ao menos um destinatário." };

  const admin = createAdminClient();

  // Notificações in-app (bulk insert)
  const notifRows = destinatarios.map((d) => ({
    user_id: champId ? d.userId : d.userId,
    championship_id: champId,
    tipo: "comunicado",
    titulo: titulo.trim(),
    mensagem: mensagem.trim(),
  }));
  await admin.from("notifications").insert(notifRows);

  // E-mails via Resend (best-effort, não bloqueia se falhar)
  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    await Promise.allSettled(
      destinatarios.map((d) =>
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

  return { ok: true, enviados: destinatarios.length };
}
