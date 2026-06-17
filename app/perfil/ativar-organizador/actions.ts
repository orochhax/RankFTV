"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarSubconta } from "@/lib/asaas";

export async function ativarOrganizador(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cpfCnpj   = (formData.get("cpf_cnpj")  as string).replace(/\D/g, "");
  const telefone  = (formData.get("telefone")   as string).replace(/\D/g, "");

  if (!cpfCnpj || !telefone) {
    return { error: "Preencha todos os campos." };
  }
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return { error: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos." };
  }

  const dataNascimentoInput = (formData.get("data_nascimento") as string | null) ?? "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, data_nascimento")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  const birthDate = dataNascimentoInput || profile.data_nascimento || "";
  const isCPF = cpfCnpj.length === 11;
  if (isCPF && !birthDate) {
    return { error: "Informe sua data de nascimento para continuar." };
  }

  // Salva data de nascimento no perfil se ainda não tinha.
  if (dataNascimentoInput && !profile.data_nascimento) {
    await supabase
      .from("profiles")
      .update({ data_nascimento: dataNascimentoInput })
      .eq("id", user.id);
  }

  // Cria subconta no Asaas (sandbox ou produção, via ASAAS_BASE_URL).
  let subconta;
  try {
    subconta = await criarSubconta({
      name:        profile.nome,
      email:       user.email!,
      cpfCnpj,
      mobilePhone: telefone,
      ...(birthDate ? { birthDate } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao criar conta no Asaas: ${msg}` };
  }

  // Salva no banco — upsert para ser idempotente.
  const { error: dbError } = await supabase
    .from("organizer_accounts")
    .upsert(
      {
        user_id:          user.id,
        cpf_cnpj:         cpfCnpj,
        telefone,
        asaas_account_id: subconta.id,
        asaas_wallet_id:  subconta.walletId,
        habilitado:       true,
      },
      { onConflict: "user_id" }
    );

  if (dbError) return { error: "Erro ao salvar dados. Tente novamente." };

  redirect("/painel");
}
