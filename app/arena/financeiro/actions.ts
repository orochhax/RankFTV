"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca } from "@/lib/asaas";

export type CobrancaState = { error?: string; ok?: boolean };

export async function emitirMensalidade(
  alunoId: string,        // arena_students.id
  competencia: string,    // "YYYY-MM"
): Promise<CobrancaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Valida que o usuário é dono da arena
  const { data: aluno } = await supabase
    .from("arena_students")
    .select("id, user_id, valor_mensalidade, arena_id, arenas(nome, dono_id), profiles(nome, email)")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return { error: "Aluno não encontrado." };
  const arenaRow = Array.isArray(aluno.arenas) ? aluno.arenas[0] : aluno.arenas;
  if ((arenaRow as { dono_id?: string })?.dono_id !== user.id)
    return { error: "Sem permissão." };

  const valor = Number(aluno.valor_mensalidade);
  if (!valor || valor <= 0) return { error: "Defina o valor da mensalidade do aluno primeiro." };

  // Verifica que não existe cobrança duplicada para essa competência
  const { data: existente } = await supabase
    .from("student_charges")
    .select("id, status_pagamento")
    .eq("arena_student_id", alunoId)
    .eq("competencia", competencia)
    .maybeSingle();

  if (existente) {
    if (existente.status_pagamento === "pago") return { error: "Mensalidade deste mês já está paga." };
    return { ok: true }; // já existe cobrança pendente
  }

  const profileRow = Array.isArray(aluno.profiles) ? aluno.profiles[0] : aluno.profiles;
  const alunoNome  = (profileRow as { nome?: string })?.nome ?? "Aluno";
  const alunoEmail = (profileRow as { email?: string })?.email ?? "";
  const arenaNome  = (arenaRow as { nome?: string })?.nome ?? "Arena";

  // Busca CPF do aluno em profiles_private
  const adminSupabase = createAdminClient();
  const { data: priv } = await adminSupabase
    .from("profiles_private")
    .select("cpf")
    .eq("id", aluno.user_id)
    .maybeSingle();
  const cpf = ((priv as { cpf?: string } | null)?.cpf ?? "").replace(/\D/g, "");

  if (!cpf || cpf.length !== 11) return { error: "Aluno sem CPF cadastrado — não é possível emitir cobrança." };
  if (!alunoEmail) return { error: "Aluno sem e-mail cadastrado." };

  const { data: charge, error: insErr } = await supabase
    .from("student_charges")
    .insert({
      arena_id:        aluno.arena_id,
      arena_student_id: alunoId,
      user_id:         aluno.user_id,
      competencia,
      valor,
    })
    .select("id")
    .single();

  if (insErr || !charge) return { error: "Erro ao registrar a cobrança." };

  try {
    const customer = await criarOuBuscarCliente({ name: alunoNome, email: alunoEmail, cpfCnpj: cpf });
    const cobranca = await criarCobranca({
      customerId:        customer.id,
      valorBase:         valor,
      metodo:            "pix",
      descricao:         `Mensalidade ${arenaNome} — ${competencia}`,
      externalReference: `mens:${charge.id}`,
    });

    await supabase
      .from("student_charges")
      .update({
        asaas_payment_id:   cobranca.id,
        pix_copy_paste:     cobranca.pixQrCode?.payload ?? null,
        pix_qr_code_base64: cobranca.pixQrCode?.encodedImage ?? null,
        invoice_url:        cobranca.invoiceUrl ?? null,
      })
      .eq("id", charge.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao gerar o Pix: ${msg}` };
  }

  revalidatePath("/arena/financeiro");
  return { ok: true };
}

export async function definirValorMensalidade(
  alunoId: string,
  valor: number,
): Promise<CobrancaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: aluno } = await supabase
    .from("arena_students")
    .select("id, arena_id, arenas(dono_id)")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return { error: "Aluno não encontrado." };
  const arenaRow = Array.isArray(aluno.arenas) ? aluno.arenas[0] : aluno.arenas;
  if ((arenaRow as { dono_id?: string })?.dono_id !== user.id)
    return { error: "Sem permissão." };

  await supabase
    .from("arena_students")
    .update({ valor_mensalidade: valor })
    .eq("id", alunoId);

  revalidatePath("/arena/financeiro");
  return { ok: true };
}
