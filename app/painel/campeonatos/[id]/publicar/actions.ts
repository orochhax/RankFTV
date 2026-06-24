"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublicarState = { error?: string };

// ── Validações de CPF/CNPJ e idade ─────────────────────────────────────────
function soDigitos(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

function validaCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

function validaCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dig = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dig(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== parseInt(cnpj[12])) return false;
  const d2 = dig(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === parseInt(cnpj[13]);
}

function validaCpfCnpj(digits: string): boolean {
  if (digits.length === 11) return validaCPF(digits);
  if (digits.length === 14) return validaCNPJ(digits);
  return false;
}

function idadeEm(iso: string): number {
  const nasc = new Date(iso + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Publica um campeonato (rascunho → inscrições abertas). Quando há categoria
// paga e o organizador ainda não tem chave Pix, coleta e salva os dados de
// recebimento no mesmo passo. Ver funil em ftv.md seção 8.6/8.7.
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
  if (temCategoriaPaga && !temChavePix) {
    const cpfCnpj  = soDigitos(formData.get("cpf_cnpj") as string);
    const nascimento = ((formData.get("data_nascimento") as string) ?? "").trim();
    const telefone = soDigitos(formData.get("telefone") as string);
    const chavePix = ((formData.get("chave_pix") as string) ?? "").trim();

    if (!validaCpfCnpj(cpfCnpj)) {
      return { error: "Informe um CPF ou CNPJ válido." };
    }
    if (!nascimento) {
      return { error: "Informe a data de nascimento." };
    }
    if (Number.isNaN(Date.parse(nascimento)) || idadeEm(nascimento) < 18) {
      return { error: "O organizador precisa ter pelo menos 18 anos." };
    }
    if (!chavePix || chavePix.length < 5) {
      return { error: "Informe uma chave Pix válida para receber os pagamentos." };
    }
    if (!telefone || telefone.length < 10) {
      return { error: "Informe um celular válido com DDD." };
    }

    const { error: upErr } = await supabase
      .from("organizer_accounts")
      .upsert(
        {
          user_id: user.id,
          cpf_cnpj: cpfCnpj,
          data_nascimento: nascimento,
          telefone,
          chave_pix: chavePix,
          habilitado: true,
        },
        { onConflict: "user_id" },
      );
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
