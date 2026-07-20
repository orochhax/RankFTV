"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, tokenizarCartao } from "@/lib/asaas";

export type SalvarCartaoInput = {
  arenaId:        string;
  handle:         string;
  cpf:            string;
  cep:            string;
  numeroEndereco: string;
  numero:         string;
  nomeTitular:    string;
  mesValidade:    string;
  anoValidade:    string;
  cvv:            string;
};

export type SalvarCartaoResult =
  | { ok: true }
  | { ok: false; error: string };

// Cadastra ou troca o cartão padrão do aluno nesta arena. Número completo e
// CVV vão só nesta chamada, direto pro Asaas (tokenização) — nunca chegam a
// ser gravados no Supabase, só o token e os metadados não sensíveis.
export async function salvarCartaoArena(input: SalvarCartaoInput): Promise<SalvarCartaoResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const cpfNum = input.cpf.replace(/\D/g, "");
  const cep = input.cep.replace(/\D/g, "");
  const numeroEndereco = input.numeroEndereco.trim();
  if (cpfNum.length !== 11) return { ok: false, error: "CPF inválido." };
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };
  if (!numeroEndereco) return { ok: false, error: "Informe o número do endereço do titular." };

  const digits = input.numero.replace(/\s/g, "");
  if (digits.length < 13) return { ok: false, error: "Número do cartão incompleto." };
  if (!/^\d{2}$/.test(input.mesValidade) || !/^\d{4}$/.test(input.anoValidade)) {
    return { ok: false, error: "Validade inválida." };
  }
  if (input.cvv.length < 3) return { ok: false, error: "CVV inválido." };
  if (!input.nomeTitular.trim()) return { ok: false, error: "Digite o nome como está no cartão." };

  // Confirma que o aluno é mesmo aluno ativo desta arena — nunca confia no
  // arenaId vindo do formulário sem checar o vínculo.
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("id")
    .eq("arena_id", input.arenaId)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (!vinculo) return { ok: false, error: "Você não é aluno ativo desta arena." };

  const { data: profile } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };

  try {
    const customer = await criarOuBuscarCliente({ name: profile.nome, email: user.email!, cpfCnpj: cpfNum });
    const cartao = await tokenizarCartao({
      customerId: customer.id,
      cartao: {
        holderName:  input.nomeTitular,
        number:      digits,
        expiryMonth: input.mesValidade,
        expiryYear:  input.anoValidade,
        ccv:         input.cvv,
      },
      titular: {
        name:          profile.nome,
        email:         user.email!,
        cpfCnpj:       cpfNum,
        postalCode:    cep,
        addressNumber: numeroEndereco,
      },
    });

    // asaas_card_token é um token reutilizável de cobrança — só service_role
    // escreve/lê a coluna (ver harden-card-token-security.sql). A
    // autorização (é aluno ativo desta arena) já foi checada acima com o
    // client do próprio usuário.
    await Promise.all([
      createAdminClient().from("arena_student_cards").upsert(
        {
          arena_id:          input.arenaId,
          user_id:           user.id,
          asaas_customer_id: customer.id,
          asaas_card_token:  cartao.creditCardToken,
          brand:             cartao.creditCardBrand,
          last4:             cartao.creditCardNumber,
          exp_month:         Number(input.mesValidade),
          exp_year:          Number(input.anoValidade),
          updated_at:        new Date().toISOString(),
        },
        { onConflict: "arena_id,user_id" },
      ),
      supabase.from("profiles_private").upsert({ user_id: user.id, cpf: cpfNum }, { onConflict: "user_id" }),
    ]);

    revalidatePath(`/arenas/${input.handle}/financeiro`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar o cartão.";
    return { ok: false, error: msg.includes("Asaas") ? "Não foi possível registrar o cartão. Confira os dados e tente de novo." : msg };
  }
}

export async function removerCartaoArena(arenaId: string): Promise<SalvarCartaoResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  await createAdminClient()
    .from("arena_student_cards")
    .delete()
    .eq("arena_id", arenaId)
    .eq("user_id", user.id);

  return { ok: true };
}
