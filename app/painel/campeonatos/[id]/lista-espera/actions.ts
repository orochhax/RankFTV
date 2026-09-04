"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM } from "@/lib/email/resend";
import { conviteListaEsperaHtml } from "@/lib/email/templates";
import { resolveBaseUrl } from "@/lib/site-url";
import { createWaitlistInvite, WAITLIST_INVITE_HOURS } from "@/lib/waitlist";
import { registrarAuditoria } from "@/lib/audit";

export async function convidarProximoDaLista(formData: FormData) {
  const championshipId = String(formData.get("championship_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: championship } = await supabase.from("championships").select("nome, organizador_id").eq("id", championshipId).maybeSingle();
  if (!championship || championship.organizador_id !== user.id) return;
  const admin = createAdminClient();
  const { data: category } = await admin.from("championship_categories").select("nome").eq("id", categoryId).eq("championship_id", championshipId).maybeSingle();
  if (!category) return;
  const { data: entry } = await admin.from("championship_category_waitlist").select("id, email").eq("category_id", categoryId).eq("status", "waiting").order("created_at").limit(1).maybeSingle();
  if (!entry || !process.env.RESEND_API_KEY) return;
  const invite = createWaitlistInvite();
  const expiresAt = new Date(Date.now() + WAITLIST_INVITE_HOURS * 60 * 60 * 1000).toISOString();
  const { data: updated } = await admin.from("championship_category_waitlist").update({ status: "invited", invite_token_hash: invite.hash, invite_expires_at: expiresAt, invited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", entry.id).eq("status", "waiting").select("id").maybeSingle();
  if (!updated) return;
  const url = `${resolveBaseUrl()}/lista-espera/${invite.token}`;
  try {
    const sent = await getResend().emails.send({
      from: FROM,
      to: entry.email,
      subject: `Vaga disponível — ${championship.nome}`,
      html: conviteListaEsperaHtml({ championshipName: championship.nome, categoryName: category.nome, url, hours: WAITLIST_INVITE_HOURS }),
    });
    if (sent.error) throw sent.error;
  } catch {
    await admin.from("championship_category_waitlist").update({ status: "waiting", invite_token_hash: null, invite_expires_at: null, invited_at: null, updated_at: new Date().toISOString() }).eq("id", entry.id);
    return;
  }
  await registrarAuditoria({ actorId: user.id, acao: "waitlist_invitation_sent", alvoTabela: "championship_category_waitlist", alvoId: entry.id, detalhes: { championship_id: championshipId, category_id: categoryId, expires_at: expiresAt } });
  revalidatePath(`/painel/campeonatos/${championshipId}/lista-espera`);
}
