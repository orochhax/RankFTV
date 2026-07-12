"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublicarState = { error?: string };

// Publica um campeonato (rascunho → inscrições abertas). CPF/CNPJ, nascimento
// e telefone já foram coletados na ativação de organizador (/perfil/ativar-
// organizador); aqui só falta a chave Pix, se ainda não tiver. Ver funil em
// ftv.md seção 8.6/8.7.
export async function publicarCampeonato(
  _prev: PublicarState,
  formData: FormData,
): Promise<PublicarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const championshipId = formData.get("championship_id") as string;
  if (!championshipId) return { error: "Campeonato não encontrado." };

  const maxParcelasInscricao = Math.min(12, Math.max(1, parseInt(formData.get("max_parcelas_inscricao") as string) || 1));
  const maxParcelasIngresso  = Math.min(12, Math.max(1, parseInt(formData.get("max_parcelas_ingresso")  as string) || 1));

  // Aceite dos Termos de uso é obrigatório pra publicar.
  if (!formData.get("aceito_termos")) {
    return { error: "Você precisa aceitar os Termos de uso para publicar." };
  }

  // Verifica dono
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id, status")
    .eq("id", championshipId)
    .maybeSingle();

  if (!champ) return { error: "Campeonato não encontrado." };
  if (champ.organizador_id !== user.id) return { error: "Você não tem permissão." };

  // Categorias pagas?
  const { data: cats } = await supabase
    .from("championship_categories")
    .select("valor_inscricao")
    .eq("championship_id", championshipId);
  const temCategoriaPaga = (cats ?? []).some((c) => Number(c.valor_inscricao) > 0);

  // Chave Pix já cadastrada?
  const { data: orgAccount } = await supabase
    .from("organizer_accounts")
    .select("chave_pix")
    .eq("user_id", user.id)
    .maybeSingle();
  const temChavePix = !!orgAccount?.chave_pix;

  // Se tem categoria paga e ainda não tem Pix, coleta e salva agora.
  // (CPF/CNPJ, nascimento e telefone já foram coletados na ativação.)
  if (temCategoriaPaga && !temChavePix) {
    const chavePix = ((formData.get("chave_pix") as string) ?? "").trim();

    if (!chavePix || chavePix.length < 5) {
      return { error: "Informe uma chave Pix válida para receber os pagamentos." };
    }

    const { error: upErr } = await supabase
      .from("organizer_accounts")
      .update({ chave_pix: chavePix })
      .eq("user_id", user.id);
    if (upErr) return { error: "Erro ao salvar seus dados de recebimento. Tente de novo." };
  }

  // Publica e salva as configurações de parcelamento.
  const { error: stErr } = await supabase
    .from("championships")
    .update({
      status: "inscricoes_abertas",
      max_parcelas_inscricao: maxParcelasInscricao,
      max_parcelas_ingresso:  maxParcelasIngresso,
    })
    .eq("id", championshipId);
  if (stErr) return { error: "Não foi possível publicar. Tente de novo." };

  revalidatePath("/painel");
  revalidatePath("/campeonatos");
  redirect(`/painel/campeonatos/${championshipId}/criado`);
}
