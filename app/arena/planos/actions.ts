"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelarAssinatura } from "@/lib/asaas";

async function getArenaId(handle: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) throw new Error("Arena não encontrada");
  return { supabase, arenaId: arena.id };
}

// "" ou inválido → null (sem limite semanal)
function parseAulasSemana(raw: FormDataEntryValue | null): number | null {
  const n = parseInt((raw as string) ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const TIPOS_PLANO = new Set(["mensalidade", "aluguel", "diaria"]);

function validarPlano(tipo: string, nome: string, valor: number) {
  if (!TIPOS_PLANO.has(tipo)) throw new Error("Tipo de plano inválido");
  if (!nome || nome.length > 80) throw new Error("Nome de plano inválido");
  if (!Number.isFinite(valor) || valor < 0 || valor > 1_000_000)
    throw new Error("Valor de plano inválido");
}

/**
 * Interrompe a renovação de quem está no plano `planId` — chamada tanto ao
 * reprecificar (a versão antiga não pode continuar cobrando o valor velho)
 * quanto ao arquivar. Nunca mexe no período já pago: só marca que não vai
 * renovar de novo. Cancelar no Asaas é a única parte que pode falhar (rede,
 * assinatura já cancelada lá etc.) — quando falha, a linha fica com
 * renovacao_ativa ainda true e o erro registrado em
 * renovacao_cancelamento_erro, pra nunca ficar achando (e mostrando) que a
 * renovação parou quando o Asaas ainda vai cobrar. Isso é o que evita banco
 * e provedor divergindo silenciosamente.
 */
async function cancelarRenovacoesDoPlano(
  admin: ReturnType<typeof createAdminClient>,
  planId: string,
): Promise<{ canceladas: number; falhas: number }> {
  const { data: alunos } = await admin
    .from("arena_students")
    .select("id, asaas_subscription_id, access_until")
    .eq("plan_id", planId)
    .eq("renovacao_ativa", true);

  const okIds: string[] = [];
  // Plano gratuito nunca teve assinatura no Asaas nem access_until (não há
  // webhook que avance essa data pra alguém que nunca pagou nada) — sem essa
  // marcação especial, access_until ficaria null pra sempre e
  // temAcessoAoPlano trataria isso como "acesso legado sempre válido",
  // nunca encerrando de fato o acesso gratuito arquivado.
  const semAssinaturaIds: string[] = [];
  let falhas = 0;

  for (const aluno of alunos ?? []) {
    if (aluno.asaas_subscription_id) {
      try {
        await cancelarAssinatura(aluno.asaas_subscription_id);
      } catch (e) {
        falhas++;
        await admin
          .from("arena_students")
          .update({ renovacao_cancelamento_erro: (e instanceof Error ? e.message : String(e)).slice(0, 300) })
          .eq("id", aluno.id);
        continue;
      }
    } else if (aluno.access_until == null) {
      semAssinaturaIds.push(aluno.id);
    }
    okIds.push(aluno.id);
  }

  if (okIds.length > 0) {
    await admin
      .from("arena_students")
      .update({
        renovacao_ativa: false,
        plano_encerrado_em: new Date().toISOString(),
        renovacao_cancelamento_erro: null,
      })
      .in("id", okIds);
  }
  if (semAssinaturaIds.length > 0) {
    const hoje = new Date().toISOString().split("T")[0];
    await admin.from("arena_students").update({ access_until: hoje }).in("id", semAssinaturaIds);
  }

  return { canceladas: okIds.length, falhas };
}

export async function addPlan(formData: FormData) {
  const handle   = formData.get("handle") as string;
  const tipo     = formData.get("tipo") as string;
  const nome     = (formData.get("nome") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  const valor    = parseFloat(formData.get("valor") as string);
  const aulasSemana = tipo === "mensalidade" ? parseAulasSemana(formData.get("aulas_por_semana")) : null;

  validarPlano(tipo, nome, valor);

  const { supabase, arenaId } = await getArenaId(handle);

  await supabase.from("arena_plans").insert({
    arena_id: arenaId, tipo, nome, descricao, valor,
    aulas_por_semana: aulasSemana,
  });

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

export async function togglePlan(planId: string, ativo: boolean, handle: string) {
  const { supabase, arenaId } = await getArenaId(handle);
  await supabase.from("arena_plans").update({ ativo }).eq("id", planId).eq("arena_id", arenaId);
  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}

/**
 * Arquiva o plano (nunca DELETE): some do catálogo de novas contratações,
 * mas a linha continua existindo — é o histórico de nome/valor/condições de
 * quem já contratou (arena_students.plan_id aponta pra cá pra sempre).
 * Quem já está no plano cancela a renovação futura no Asaas e mantém o
 * acesso até access_until (confirmarPresenca decide isso olhando
 * access_until, não o estado do plano).
 */
export async function arquivarPlano(planId: string, handle: string): Promise<{ error?: string }> {
  const { arenaId } = await getArenaId(handle);
  const admin = createAdminClient();

  const { data: plano } = await admin
    .from("arena_plans")
    .select("id, arquivado_em")
    .eq("id", planId)
    .eq("arena_id", arenaId)
    .maybeSingle();
  if (!plano) return { error: "Plano não encontrado." };
  if (plano.arquivado_em) return {}; // já arquivado — idempotente, não repete o cancelamento

  await admin.from("arena_plans").update({ ativo: false, arquivado_em: new Date().toISOString() }).eq("id", planId);

  const { falhas } = await cancelarRenovacoesDoPlano(admin, planId);

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
  return falhas > 0
    ? { error: `Plano arquivado, mas ${falhas} assinatura(s) não puderam ser canceladas no Asaas — veja a lista de alunos.` }
    : {};
}

export async function updatePlan(formData: FormData): Promise<{ error?: string }> {
  const handle    = formData.get("handle") as string;
  const planId    = formData.get("planId") as string;
  const nome      = (formData.get("nome") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  const valor     = parseFloat(formData.get("valor") as string);
  const tipo      = formData.get("tipo") as string;
  const aulasSemana = tipo === "mensalidade" ? parseAulasSemana(formData.get("aulas_por_semana")) : null;

  validarPlano(tipo, nome, valor);

  const { arenaId } = await getArenaId(handle);
  const admin = createAdminClient();

  const { data: planoAtual } = await admin
    .from("arena_plans")
    .select("*")
    .eq("id", planId)
    .eq("arena_id", arenaId)
    .maybeSingle();
  if (!planoAtual) return { error: "Plano não encontrado." };

  // Só mensalidade tem assinatura recorrente pra proteger — aluguel e
  // diária são cobrança avulsa a cada compra nova, então mudar o preço não
  // afeta ninguém que já pagou e pode ser uma edição direta na mesma linha,
  // igual nome/descrição/aulas por semana.
  const precisaVersionar = tipo === "mensalidade" && Number(planoAtual.valor) !== valor;

  if (!precisaVersionar) {
    await admin.from("arena_plans").update({
      nome, descricao, valor,
      ...(tipo === "mensalidade" ? { aulas_por_semana: aulasSemana } : {}),
    }).eq("id", planId);
    revalidatePath(`/arena/planos`);
    revalidatePath(`/arenas/${handle}`);
    return {};
  }

  // Preço mudou: a linha atual vira histórico (arquivada, valor antigo
  // intacto) e uma nova assume o valor novo — só ela aparece pra novas
  // contratações. Quem já tinha assinado continua com o valor antigo até o
  // fim do período pago, sem renovar de novo sob a configuração antiga.
  await admin.from("arena_plans").update({ ativo: false, arquivado_em: new Date().toISOString() }).eq("id", planId);

  const { error: insErr } = await admin.from("arena_plans").insert({
    arena_id:           arenaId,
    tipo,
    nome,
    descricao,
    valor,
    aulas_por_semana:   tipo === "mensalidade" ? aulasSemana : null,
    aceita_credito:     planoAtual.aceita_credito,
    aceita_debito:      planoAtual.aceita_debito,
    dia_vencimento:     planoAtual.dia_vencimento,
    ordem:              planoAtual.ordem,
    ativo:              true,
    versao_anterior_id: planId,
  });
  if (insErr) return { error: "Erro ao criar a nova versão do plano." };

  const { falhas } = await cancelarRenovacoesDoPlano(admin, planId);

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
  return falhas > 0
    ? { error: `Novo preço salvo, mas ${falhas} assinatura(s) da versão antiga não puderam ser canceladas no Asaas — veja a lista de alunos.` }
    : {};
}

export async function updatePlanPaymentConfig(formData: FormData) {
  const handle        = formData.get("handle") as string;
  const planId        = formData.get("planId") as string;
  const aceitaCredito = formData.get("aceita_credito") === "true";
  const aceitaDebito  = formData.get("aceita_debito") === "true";
  const rawDia = parseInt(formData.get("dia_vencimento") as string, 10);
  const diaVencimento = Number.isInteger(rawDia) && rawDia >= 1 && rawDia <= 28 ? rawDia : 10;

  const { supabase, arenaId } = await getArenaId(handle);
  await supabase.from("arena_plans").update({
    aceita_credito:  aceitaCredito,
    aceita_debito:   aceitaDebito,
    dia_vencimento:  diaVencimento,
  }).eq("id", planId).eq("arena_id", arenaId);

  revalidatePath(`/arena/planos`);
  revalidatePath(`/arenas/${handle}`);
}
