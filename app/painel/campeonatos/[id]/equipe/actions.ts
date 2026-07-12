"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { enviarConviteStaff } from "@/lib/email/send";

// Busca em tempo real do @usuário fica em /api/users/search (mesma rota usada
// pelo UserSearchInput). Este arquivo só cuida das actions de convite/permissão.

export async function convidarStaff(
  champId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id, nome")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, error: "Sem permissão." };

  if (userId === user.id)
    return { ok: false, error: "Você não pode convidar a si mesmo." };

  // Verifica se já existe registro
  const { data: existing } = await supabase
    .from("championship_staff")
    .select("id, status")
    .eq("championship_id", champId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "aceito")  return { ok: false, error: "Usuário já é staff deste campeonato." };
    if (existing.status === "pendente") return { ok: false, error: "Convite já enviado — aguardando resposta." };
    // recusado → re-envia
    const { error } = await supabase
      .from("championship_staff")
      .update({ status: "pendente", invited_by: user.id })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Erro ao reenviar convite." };
    revalidatePath(`/painel/campeonatos/${champId}/equipe`);
    return { ok: true };
  }

  const { error } = await supabase.from("championship_staff").insert({
    championship_id: champId,
    user_id:         userId,
    invited_by:      user.id,
    status:          "pendente",
  });

  if (error) return { ok: false, error: "Erro ao enviar convite." };

  // Envia e-mail (best-effort — não bloqueia se falhar). profiles não tem
  // e-mail; busca o do convidado via admin (auth.users).
  const [{ data: orgProfile }, { data: invitedProfile }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", user.id).single(),
    supabase.from("profiles").select("nome").eq("id", userId).single(),
  ]);
  const { data: invitedAuth } = await createAdminClient().auth.admin.getUserById(userId);
  const invitedEmail = invitedAuth?.user?.email ?? null;

  if (invitedEmail) {
    await enviarConviteStaff({
      emailConvidado:   invitedEmail,
      nomeConvidado:    invitedProfile?.nome ?? "Atleta",
      nomeOrganizador:  orgProfile?.nome ?? "Organizador",
      nomeCampeonato:   champ.nome,
      permissoes:       "QR Code",
    });
  }

  revalidatePath(`/painel/campeonatos/${champId}/equipe`);
  return { ok: true };
}

export async function updatePermissions(
  staffId:        string,
  canQrcode:      boolean,
  canInscricoes:  boolean,
  canChaveamento: boolean,
  champId:        string,
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("championship_staff")
    .select("championship_id, championships(organizador_id)")
    .eq("id", staffId)
    .single();

  const orgId = (row as { championships: { organizador_id: string } | null } | null)
    ?.championships?.organizador_id;
  if (orgId !== user.id) return;

  await supabase
    .from("championship_staff")
    .update({
      can_qrcode:      canQrcode,
      can_inscricoes:  canInscricoes,
      can_chaveamento: canChaveamento,
    })
    .eq("id", staffId);

  revalidatePath(`/painel/campeonatos/${champId}/equipe`);
}

export async function removerStaff(staffId: string, champId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("championship_staff")
    .select("championship_id, championships(organizador_id)")
    .eq("id", staffId)
    .single();

  const orgId = (row as { championships: { organizador_id: string } | null } | null)
    ?.championships?.organizador_id;
  if (orgId !== user.id) return;

  await supabase.from("championship_staff").delete().eq("id", staffId);

  revalidatePath(`/painel/campeonatos/${champId}/equipe`);
}
