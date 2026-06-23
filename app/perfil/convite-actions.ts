"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarConviteAceito, enviarInscricaoConfirmada } from "@/lib/email/send";

export async function aceitarConvite(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const teamId = formData.get("team_id") as string;

  // Garante que só o atleta2 pode aceitar, e só se ainda estiver pendente.
  // atleta2_id null = convite aberto (link direto sem @usuário especificado).
  const { data: team } = await supabase
    .from("teams")
    .select("id, atleta1_id, atleta2_id, championship_id, status")
    .eq("id", teamId)
    .single();

  if (!team || (team.atleta2_id !== null && team.atleta2_id !== user.id) || team.status !== "convite_pendente") return;

  // Se convite aberto (atleta2_id null), associa o usuário atual como parceiro
  if (team.atleta2_id === null) {
    await supabase.from("teams").update({ atleta2_id: user.id }).eq("id", teamId);
  }

  await supabase
    .from("teams")
    .update({ status: "confirmado" })
    .eq("id", teamId);

  // Busca inscrição, atleta1 e atleta2 em paralelo (profiles não tem e-mail).
  const [{ data: reg }, { data: atleta1Profile }, { data: atleta2Profile }, { data: champ }] =
    await Promise.all([
      supabase.from("registrations").select("valor, category_id, status_pagamento").eq("team_id", teamId).maybeSingle(),
      supabase.from("profiles").select("nome, username").eq("id", team.atleta1_id).single(),
      supabase.from("profiles").select("nome, username").eq("id", user.id).single(),
      supabase.from("championships").select("nome").eq("id", team.championship_id).single(),
    ]);

  // E-mails vêm de auth.users: o do atleta2 é o próprio usuário logado; o do
  // atleta1 (quem convidou) busca via admin.
  const admin = createAdminClient();
  const { data: a1Auth } = await admin.auth.admin.getUserById(team.atleta1_id);
  const atleta1Email = a1Auth?.user?.email ?? null;
  const atleta2Email = user.email ?? null;

  const categoryId = reg?.category_id ?? "";
  const { data: categoria } = categoryId
    ? await supabase.from("championship_categories").select("nome").eq("id", categoryId).single()
    : { data: null };

  const isGratis = reg && Number(reg.valor) === 0;
  const isPago = reg?.status_pagamento === "pago";

  // Gera credencial para o atleta2 quando:
  //   - inscrição gratuita (atleta1 já ganhou a dele na hora da inscrição), OU
  //   - inscrição paga já confirmada (atleta1 ganhou a dele via webhook; aqui só o atleta2)
  if (isGratis || isPago) {
    if (isGratis) {
      // Gratuito: gera também para atleta1 se ainda não tiver
      const { data: cred1 } = await supabase
        .from("credentials")
        .select("id")
        .eq("user_id", team.atleta1_id)
        .eq("championship_id", team.championship_id)
        .maybeSingle();

      if (!cred1) {
        await supabase.from("credentials").insert({
          user_id:         team.atleta1_id,
          championship_id: team.championship_id,
          role:            "atleta",
          qr_token:        crypto.randomUUID(),
          checked_in:      false,
        });
      }
    }

    // Credencial para atleta2 (quem aceitou) se ainda não tiver
    const { data: cred2 } = await supabase
      .from("credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("championship_id", team.championship_id)
      .maybeSingle();

    if (!cred2) {
      await supabase.from("credentials").insert({
        user_id:         user.id,
        championship_id: team.championship_id,
        role:            "atleta",
        qr_token:        crypto.randomUUID(),
        checked_in:      false,
      });
    }

    // E-mail de confirmação para atleta2 (quem aceitou)
    if (atleta2Email && atleta2Profile && champ && categoria) {
      await enviarInscricaoConfirmada({
        emailAtleta:    atleta2Email,
        nomeAtleta:     atleta2Profile.nome,
        nomeCampeonato: champ.nome,
        nomeCategoria:  categoria.nome,
        championshipId: team.championship_id,
      });
    }
  }

  // E-mail para atleta1 avisando que o convite foi aceito
  if (atleta1Email && atleta1Profile && atleta2Profile && champ && categoria) {
    await enviarConviteAceito({
      emailAtleta1:    atleta1Email,
      nomeAtleta1:     atleta1Profile.nome,
      nomeAtleta2:     atleta2Profile.nome,
      usernameAtleta2: atleta2Profile.username ?? "",
      nomeCampeonato:  champ.nome,
      nomeCategoria:   categoria.nome,
      championshipId:  team.championship_id,
    });
  }

  revalidatePath("/perfil");
  revalidatePath("/notificacoes");
}

export async function recusarConvite(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const teamId = formData.get("team_id") as string;

  const { data: team } = await supabase
    .from("teams")
    .select("id, atleta2_id, status")
    .eq("id", teamId)
    .single();

  if (!team || team.atleta2_id !== user.id || team.status !== "convite_pendente") return;

  await supabase
    .from("teams")
    .update({ status: "recusado" })
    .eq("id", teamId);

  revalidatePath("/perfil");
  revalidatePath("/notificacoes");
}
