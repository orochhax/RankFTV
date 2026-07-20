"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarArena, notificarResponsaveisArena } from "@/lib/arena-notify";
import { valorAvulsaComTaxa, interpretarErroRpc } from "@/lib/arena-attendance";

// Mantido por compatibilidade com o resto deste arquivo (aceitarAluno etc.);
// notificarArena é a mesma função, movida pra lib/ pra ser reaproveitada
// pelas actions de presença/cobrança sem duplicar o insert.
const notificar = notificarArena;

export async function aceitarAluno(alunoId: string, arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verifica que o usuário é dono da arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome")
    .eq("id", arenaId)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  const { data: vinculo, error } = await createAdminClient()
    .from("arena_students")
    .update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] })
    .eq("id", alunoId)
    .eq("arena_id", arenaId)
    .select("user_id")
    .single();

  if (error || !vinculo) return { error: "Erro ao aceitar aluno." };

  // Avisa o aluno que foi aceito
  await notificar(
    vinculo.user_id,
    "Você foi aceito na arena!",
    `Seu pedido de entrada na ${arena.nome} foi aprovado. Agora você já pode marcar presença nas aulas.`,
  );

  revalidatePath("/arena");
  return {};
}

export async function recusarAluno(alunoId: string, arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  await createAdminClient()
    .from("arena_students")
    .update({ status: "inativo" })
    .eq("id", alunoId)
    .eq("arena_id", arenaId);

  revalidatePath("/arena");
  return {};
}

export async function entrarNaArena(arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para entrar na arena." };

  // Dados da arena (pra validar e notificar o dono)
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("id", arenaId)
    .maybeSingle();
  if (!arena) return { error: "Arena não encontrada." };
  const admin = createAdminClient();

  // Verifica se já é aluno
  const { data: existente } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    if (existente.status === "ativo")    return { error: "Você já é aluno desta arena." };
    if (existente.status === "pendente") return { error: "Seu pedido já está em análise." };
    // inativo: reativar
    const { error } = await admin
      .from("arena_students")
      .update({ status: "pendente" })
      .eq("id", existente.id);
    if (error) return { error: "Erro ao enviar o pedido. Tente novamente." };
  } else {
    const { error } = await admin
      .from("arena_students")
      .insert({ arena_id: arenaId, user_id: user.id });
    if (error) return { error: "Erro ao enviar o pedido. Tente novamente." };
  }

  // Notifica o dono da arena do novo pedido
  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, username")
    .eq("id", user.id)
    .single();
  await notificar(
    arena.dono_id,
    "Novo pedido de entrada na arena",
    `${perfil?.nome ?? "Um atleta"} (@${perfil?.username ?? "?"}) pediu para entrar na ${arena.nome}. Revise em Minha Arena.`,
  );

  revalidatePath("/perfil");
  revalidatePath(`/arena/${arena.handle}`);   // painel do dono
  revalidatePath(`/arenas/${arena.handle}`);  // página pública da arena
  return { ok: true };
}

// ── Presença com regras de plano ─────────────────────────────────────────────
// Toda a regra de negócio (gênero, vaga, crédito semanal, prazo de
// cancelamento) mora agora dentro das funções SQL SECURITY DEFINER em
// supabase/harden-arena-attendance-security.sql — nada disso é recalculado
// aqui. Isso elimina a necessidade das funções de data/semana que existiam
// só pra alimentar esses cálculos em TypeScript.

export type PresencaResult = {
  ok?: boolean;
  error?: string;
  /** Só quando ok e a reserva virou aula avulsa — usado pra confirmar o valor na UI. */
  avulsaValor?: number;
};

// Mensagens de erro que as funções de banco levantam (RAISE EXCEPTION) e que
// o usuário não deve ver cruas são mapeadas pra texto amigável por
// lib/arena-attendance.ts#interpretarErroRpc (fica lá, não aqui, porque um
// arquivo "use server" só pode exportar async function — não dava pra
// testar essa função unitariamente se ficasse neste módulo).

/**
 * Confirma presença numa aula em um dia específico. TODA a regra de negócio
 * (aluno ativo, gênero, vaga, crédito semanal, cartão salvo, prazo) é
 * decidida DENTRO da função SQL arena_confirm_attendance
 * (supabase/harden-arena-attendance-security.sql), que deriva tudo do banco
 * a partir de auth.uid() e só recebe class_id/data/confirmação do preview —
 * nunca arena_id, tipo de cobrança, limite ou valor vindos do cliente. Isso
 * fecha o caminho de alguém chamar a RPC direto (fora do Next.js) com
 * parâmetros forjados pra reservar crédito ou aula avulsa sem pagar.
 */
export async function confirmarPresenca(
  _arenaId: string,
  classId: string,
  data: string,
  avulsaConfirmada = false,
): Promise<PresencaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para confirmar presença." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };

  const { data: resultado, error } = await supabase.rpc("arena_confirm_attendance", {
    p_class_id: classId,
    p_data: data,
    p_avulsa_confirmada: avulsaConfirmada,
  });

  if (error || !resultado) {
    if (error?.code === "23505") return { error: "Você já confirmou presença nessa aula." };
    const { mensagem, valor } = interpretarErroRpc(error?.message ?? "");
    return { error: mensagem, avulsaValor: valor ? Number(valor) : undefined };
  }

  revalidatePath("/arena/presenca");
  revalidatePath(`/arenas`, "layout");
  const r = resultado as { tipo_cobranca: string; valor_avulso: number | null };
  return { ok: true, avulsaValor: r.tipo_cobranca === "avulsa" ? (r.valor_avulso ?? undefined) : undefined };
}

/**
 * Desmarca uma presença ainda "reservada" — devolve o crédito da semana e
 * libera a vaga. O prazo mínimo (cancel_horas_antes) é conferido DENTRO de
 * arena_cancel_attendance, não mais em TypeScript — o valor configurado
 * pela arena é lido do banco na própria função.
 */
export async function desmarcarPresenca(
  _arenaId: string,
  classId: string,
  data: string,
): Promise<PresencaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };

  const { data: attendance } = await supabase
    .from("arena_attendance")
    .select("id")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .eq("data", data)
    .eq("status", "reservado")
    .maybeSingle();
  if (!attendance) return { error: "Presença não encontrada ou já finalizada." };

  const { data: cancelado, error } = await supabase.rpc("arena_cancel_attendance", {
    p_attendance_id: attendance.id,
  });
  if (error) {
    const { mensagem } = interpretarErroRpc(error.message ?? "");
    return { error: mensagem };
  }
  if (!cancelado) return { error: "Erro ao desmarcar. Tente novamente." };

  revalidatePath("/arena/presenca");
  revalidatePath(`/arenas`, "layout");
  return { ok: true };
}

export async function entrarComCodigo(arenaId: string, codigo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para entrar na arena." };

  // O código não pode ser legível pelo cliente. Depois de autenticar o
  // usuário, a validação é feita exclusivamente no servidor.
  const admin = createAdminClient();
  const { data: arena } = await admin
    .from("arenas")
    .select("id, invite_code")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };
  if (arena.invite_code?.toUpperCase() !== codigo.trim().toUpperCase())
    return { error: "Código inválido." };

  const { data: existente } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente?.status === "ativo") return { error: "Você já é aluno desta arena." };

  if (existente) {
    await admin.from("arena_students").update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] }).eq("id", existente.id);
  } else {
    await admin.from("arena_students").insert({
      arena_id:    arenaId,
      user_id:     user.id,
      status:      "ativo",
      data_entrada: new Date().toISOString().split("T")[0],
    });
  }

  revalidatePath(`/arenas`);
  revalidatePath("/perfil");
  return { ok: true };
}

// ── Finalização da lista pelo professor/gerente/dono ─────────────────────────

export type FinalizeResult = { ok?: boolean; error?: string };

/**
 * Marca presente/ausente numa presença reservada. Idempotente: cliques
 * repetidos ou requisições concorrentes batem na trava finalized_at dentro
 * de arena_finalize_attendance (SECURITY DEFINER — reautoriza professor da
 * aula, gerente ou dono) e nunca repetem efeito. Quando marca "presente"
 * numa reserva avulsa ainda pendente, dispara a cobrança em seguida.
 */
export async function finalizarPresenca(
  attendanceId: string,
  status: "presente" | "ausente",
): Promise<FinalizeResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login." };

  const { data, error } = await supabase.rpc("arena_finalize_attendance", {
    p_attendance_id: attendanceId,
    p_status: status,
  });
  if (error) {
    if (error.message?.includes("not authorized")) {
      return { error: "Você não tem permissão pra finalizar essa presença." };
    }
    return { error: "Erro ao finalizar presença. Tente novamente." };
  }

  const resultado = data as {
    status: string; tipo_cobranca: string; pagamento_status: string;
    valor_avulso: number | null; arena_id: string; user_id: string; ja_estava_finalizada: boolean;
  };

  if (
    !resultado.ja_estava_finalizada &&
    resultado.status === "presente" &&
    resultado.tipo_cobranca === "avulsa" &&
    resultado.pagamento_status === "pendente"
  ) {
    await processarCobrancaAvulsa(attendanceId);
  }

  revalidatePath("/arena/[handle]/aula/[classId]", "page");
  revalidatePath("/arenas/[handle]/minhas-aulas", "page");
  revalidatePath(`/arenas`, "layout");
  return { ok: true };
}

/**
 * Reivindica e executa a cobrança de uma presença avulsa — chamada tanto
 * pelo finalize (primeira tentativa, já autorizado por
 * arena_finalize_attendance) quanto pelo retry manual (tentarCobrancaNovamente,
 * que autoriza antes de chamar esta função). arena_claim_attendance_charge e
 * arena_resolve_attendance_charge só podem ser executadas por service_role
 * (GRANT restrito na migration) — nenhum aluno consegue concluir a própria
 * cobrança chamando a RPC direto, então usamos o client admin aqui, DEPOIS
 * de já termos autorizado o chamador em TypeScript. Idempotente: uma
 * tentativa concorrente sempre vê `claimed: false` e não chama o Asaas de
 * novo. Falha nunca é silenciosa — fica registrada em pagamento_erro e gera
 * notificação pro aluno e pros responsáveis da arena.
 */
async function processarCobrancaAvulsa(attendanceId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: claim, error: claimErr } = await admin.rpc("arena_claim_attendance_charge", {
    p_attendance_id: attendanceId,
  });
  if (claimErr || !claim) return { ok: false, error: "Erro ao iniciar a cobrança." };

  const info = claim as {
    claimed: boolean; id: string; user_id: string; arena_id: string;
    valor_avulso: number | null; pagamento_status: string;
  };
  if (!info.claimed) {
    // Já paga, já em outra tentativa concorrente, ou não é mais elegível — nunca repete o efeito.
    return { ok: info.pagamento_status === "pago" };
  }

  async function resolver(sucesso: boolean, paymentId: string | null, customerId: string | null, erro: string | null) {
    await admin.rpc("arena_resolve_attendance_charge", {
      p_attendance_id: attendanceId,
      p_sucesso: sucesso,
      p_asaas_payment_id: paymentId,
      p_asaas_customer_id: customerId,
      p_erro: erro,
    });
  }

  if (info.valor_avulso == null) {
    await resolver(false, null, null, "Aula sem valor avulso configurado.");
    return { ok: false, error: "Aula sem valor avulso configurado." };
  }

  const { data: cartao } = await admin
    .from("arena_student_cards")
    .select("asaas_customer_id, asaas_card_token")
    .eq("arena_id", info.arena_id)
    .eq("user_id", info.user_id)
    .maybeSingle();

  if (!cartao) {
    await resolver(false, null, null, "Nenhum cartão válido cadastrado.");
    await notificarResponsaveisArena(
      info.arena_id,
      "Cobrança de aula avulsa pendente",
      "Um aluno confirmou presença como aula avulsa, mas não há mais cartão cadastrado. A cobrança ficou pendente.",
    );
    await notificarArena(
      info.user_id,
      "Pagamento pendente",
      "Sua aula avulsa não pôde ser cobrada porque não há cartão cadastrado. Cadastre um cartão no Financeiro da arena e tente novamente.",
    );
    return { ok: false, error: "Nenhum cartão válido cadastrado." };
  }

  const valorTotal = valorAvulsaComTaxa(Number(info.valor_avulso));

  try {
    const { cobrarComToken } = await import("@/lib/asaas");
    const pagamento = await cobrarComToken({
      customerId:        cartao.asaas_customer_id,
      creditCardToken:   cartao.asaas_card_token,
      valorBase:         valorTotal,
      descricao:         "Aula avulsa",
      externalReference: `arena_class_charge:${attendanceId}`,
    });

    await resolver(
      pagamento.paga, pagamento.id, cartao.asaas_customer_id,
      pagamento.paga ? null : `Status Asaas: ${pagamento.status}`,
    );

    if (!pagamento.paga) {
      await notificarResponsaveisArena(
        info.arena_id, "Cobrança de aula avulsa pendente",
        "Uma cobrança de aula avulsa não foi confirmada de imediato pelo Asaas. Acompanhe o status na lista da aula.",
      );
      await notificarArena(
        info.user_id, "Pagamento pendente",
        "O pagamento da sua aula avulsa ainda não foi confirmado. Você pode tentar novamente no Financeiro da arena.",
      );
    }

    return { ok: pagamento.paga, error: pagamento.paga ? undefined : `Pagamento com status ${pagamento.status}.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar o pagamento.";
    await resolver(false, null, cartao.asaas_customer_id, msg.slice(0, 300));
    await notificarResponsaveisArena(
      info.arena_id, "Cobrança de aula avulsa falhou",
      `A cobrança de uma aula avulsa falhou: ${msg.slice(0, 200)}`,
    );
    await notificarArena(
      info.user_id, "Pagamento falhou",
      "Não conseguimos cobrar sua aula avulsa. Tente novamente no Financeiro da arena ou atualize seu cartão.",
    );
    return { ok: false, error: msg };
  }
}

/**
 * Ação segura pra tentar cobrar de novo uma presença avulsa cujo pagamento
 * falhou/ficou pendente — chamável pelo próprio aluno (self-service) ou por
 * quem tem autorização de finalizar a aula (professor/gerente/dono).
 * arena_claim_attendance_charge não reautoriza mais sozinha (é só
 * service_role agora) — a autorização é feita aqui, em TypeScript, ANTES de
 * chamar o client admin: a leitura usa o client do PRÓPRIO usuário, então
 * RLS de arena_attendance (dono/professor-da-aula/gerente/dono-da-reserva)
 * já decide sozinha se a linha é visível — se vier vazia, não autoriza.
 */
export async function tentarCobrancaNovamente(attendanceId: string): Promise<FinalizeResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login." };

  const { data: attendance } = await supabase
    .from("arena_attendance")
    .select("id, tipo_cobranca")
    .eq("id", attendanceId)
    .maybeSingle();
  if (!attendance) return { error: "Cobrança não encontrada ou sem permissão." };
  if (attendance.tipo_cobranca !== "avulsa") return { error: "Essa presença não tem cobrança avulsa." };

  const resultado = await processarCobrancaAvulsa(attendanceId);
  revalidatePath(`/arenas`, "layout");
  revalidatePath("/arena/[handle]/aula/[classId]", "page");
  return resultado.ok ? { ok: true } : { error: resultado.error ?? "Não foi possível concluir a cobrança." };
}
