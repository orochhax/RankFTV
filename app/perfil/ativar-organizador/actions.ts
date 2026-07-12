"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validaCpfCnpj, idadeEm, soDigitos } from "@/lib/validacao";

export async function ativarOrganizador(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cpfCnpj    = soDigitos((formData.get("cpf_cnpj") as string) ?? "");
  const nascimento = ((formData.get("data_nascimento") as string) ?? "").trim();
  const telefone   = soDigitos((formData.get("telefone") as string) ?? "");
  const destino    = ((formData.get("destino") as string) ?? "").trim();

  if (!validaCpfCnpj(cpfCnpj)) {
    return { error: "Informe um CPF ou CNPJ válido." };
  }
  if (!nascimento || Number.isNaN(Date.parse(nascimento))) {
    return { error: "Informe a data de nascimento." };
  }
  if (idadeEm(nascimento) < 18) {
    return { error: "Você precisa ter pelo menos 18 anos para organizar eventos." };
  }
  if (telefone.length < 10) {
    return { error: "Telefone inválido. Informe com DDD." };
  }

  const { error: dbError } = await supabase
    .from("organizer_accounts")
    .upsert(
      {
        user_id: user.id,
        cpf_cnpj: cpfCnpj,
        data_nascimento: nascimento,
        telefone,
        habilitado: true,
      },
      { onConflict: "user_id" }
    );

  if (dbError) return { error: "Erro ao salvar dados. Tente novamente." };

  redirect(destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "/painel/novo-campeonato");
}
