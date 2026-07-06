"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Notificação in-app (best-effort — nunca bloqueia o fluxo principal).
async function notificar(userId: string, titulo: string, mensagem: string) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      championship_id: null,
      tipo: "arena",
      titulo,
      mensagem,
    });
  } catch {
    console.error("[arena] falha ao criar notificação para", userId);
  }
}

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

  const { data: vinculo, error } = await supabase
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

  await supabase
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
    const { error } = await supabase
      .from("arena_students")
      .update({ status: "pendente" })
      .eq("id", existente.id);
    if (error) return { error: "Erro ao enviar o pedido. Tente novamente." };
  } else {
    const { error } = await supabase
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

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "Agora" no fuso de Brasília, como Date naive (comparável com data+horario da aula).
function agoraSP(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

// Semana seg–dom que contém a data (o limite do plano conta dentro dela).
function semanaDe(dataISO: string): { ini: string; fim: string } {
  const d = new Date(dataISO + "T12:00:00");
  const diffSegunda = (d.getDay() + 6) % 7; // seg=0 … dom=6
  const seg = new Date(d);
  seg.setDate(d.getDate() - diffSegunda);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  return { ini: isoDate(seg), fim: isoDate(dom) };
}

export type PresencaResult = { ok?: boolean; error?: string };

/**
 * Confirma presença numa aula em um dia específico (hoje até hoje+6).
 * Valida: aluno ativo, aula do dia, horário ainda não passou, vaga disponível
 * e limite semanal do plano (aulas_por_semana; sem limite = ilimitado).
 * Pode marcar mais de uma aula no mesmo dia, desde que caiba na semana.
 */
export async function confirmarPresenca(
  arenaId: string,
  classId: string,
  data: string,
): Promise<PresencaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para confirmar presença." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };

  // Janela: hoje até hoje+6 (Brasília)
  const agora = agoraSP();
  const hoje = isoDate(agora);
  const limite = new Date(agora);
  limite.setDate(agora.getDate() + 6);
  if (data < hoje || data > isoDate(limite)) {
    return { error: "Só é possível confirmar presença até 6 dias à frente." };
  }

  // Aluno ativo da arena (traz o plano junto)
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("id, plan_id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (!vinculo) return { error: "Você não é aluno ativo desta arena." };

  // Aula válida naquele dia da semana
  const { data: aula } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, dias_semana, max_alunos")
    .eq("id", classId)
    .eq("arena_id", arenaId)
    .eq("ativo", true)
    .maybeSingle();
  if (!aula) return { error: "Aula não encontrada." };

  const dow = new Date(data + "T12:00:00").getDay();
  if (!(aula.dias_semana ?? []).includes(dow)) {
    return { error: "Essa aula não acontece nesse dia." };
  }

  // Aula de hoje que já começou não aceita mais confirmação
  if (data === hoje && aula.horario) {
    const inicio = new Date(`${data}T${aula.horario}:00`);
    if (agora >= inicio) return { error: "Essa aula já começou." };
  }

  const admin = createAdminClient();

  // Vagas (contagem via admin — o RLS esconde as presenças dos outros alunos)
  if (aula.max_alunos != null) {
    const { count } = await admin
      .from("arena_attendance")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("data", data);
    if ((count ?? 0) >= aula.max_alunos) {
      return { error: "Essa aula já está lotada." };
    }
  }

  // Limite semanal do plano (seg a dom da semana da aula)
  if (vinculo.plan_id) {
    const { data: plano } = await admin
      .from("arena_plans")
      .select("aulas_por_semana")
      .eq("id", vinculo.plan_id)
      .maybeSingle();
    const limiteSemana = plano?.aulas_por_semana ?? null;
    if (limiteSemana != null) {
      const { ini, fim } = semanaDe(data);
      const { count } = await supabase
        .from("arena_attendance")
        .select("id", { count: "exact", head: true })
        .eq("arena_id", arenaId)
        .eq("user_id", user.id)
        .gte("data", ini)
        .lte("data", fim);
      if ((count ?? 0) >= limiteSemana) {
        return {
          error: `Seu plano dá direito a ${limiteSemana} aula${limiteSemana > 1 ? "s" : ""} por semana — você já usou todas nesta semana.`,
        };
      }
    }
  }

  const { error } = await supabase.from("arena_attendance").insert({
    class_id: classId,
    arena_id: arenaId,
    user_id: user.id,
    data,
  });
  if (error) {
    if (error.code === "23505") return { error: "Você já confirmou presença nessa aula." };
    return { error: "Erro ao confirmar presença. Tente novamente." };
  }

  revalidatePath("/arena/presenca");
  return { ok: true };
}

/**
 * Desmarca uma presença confirmada — devolve o crédito da semana e libera a
 * vaga. Só até `cancel_horas_antes` horas antes da aula (configurado pelo dono).
 */
export async function desmarcarPresenca(
  arenaId: string,
  classId: string,
  data: string,
): Promise<PresencaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };

  const { data: aula } = await supabase
    .from("arena_classes")
    .select("id, horario")
    .eq("id", classId)
    .eq("arena_id", arenaId)
    .maybeSingle();
  if (!aula) return { error: "Aula não encontrada." };

  // Antecedência mínima configurada pelo dono (padrão 2h se a migração não rodou)
  let cancelHoras = 2;
  const { data: cfgArena } = await supabase
    .from("arenas")
    .select("cancel_horas_antes")
    .eq("id", arenaId)
    .maybeSingle();
  if (typeof cfgArena?.cancel_horas_antes === "number") {
    cancelHoras = cfgArena.cancel_horas_antes;
  }

  const agora = agoraSP();
  if (aula.horario) {
    const inicio = new Date(`${data}T${aula.horario}:00`);
    const prazo = new Date(inicio.getTime() - cancelHoras * 3600_000);
    if (agora > prazo) {
      return {
        error: `O prazo pra desmarcar já passou — só até ${cancelHoras}h antes da aula.`,
      };
    }
  } else if (data < isoDate(agora)) {
    return { error: "Essa aula já passou." };
  }

  const { error } = await supabase
    .from("arena_attendance")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .eq("data", data);
  if (error) return { error: "Erro ao desmarcar. Tente novamente." };

  revalidatePath("/arena/presenca");
  return { ok: true };
}

export async function entrarComCodigo(arenaId: string, codigo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para entrar na arena." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, invite_code")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };
  if (arena.invite_code?.toUpperCase() !== codigo.toUpperCase())
    return { error: "Código inválido." };

  const { data: existente } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente?.status === "ativo") return { error: "Você já é aluno desta arena." };

  if (existente) {
    await supabase.from("arena_students").update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] }).eq("id", existente.id);
  } else {
    await supabase.from("arena_students").insert({
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
