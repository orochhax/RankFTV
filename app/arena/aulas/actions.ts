"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarIntervaloHorario } from "@/lib/arena-dates";

export type AulaState = { error?: string };

const NIVEIS = ["iniciante", "intermediario", "avancado"];
const PUBLICOS = ["misto", "masculino", "feminino"];
const HORA_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Confirma que `arenaId` existe e que o usuário pode gerenciar suas aulas —
// dono ou staff com papel "gerente". Nunca confia cegamente num "a primeira
// arena do dono" — obrigatório quando o mesmo dono tem mais de uma arena,
// senão a ação pode ler/escrever na arena errada.
async function requireManagedArena(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  arenaId: string,
) {
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, dono_id")
    .eq("id", arenaId)
    .maybeSingle();
  if (!arena) return null;
  if (arena.dono_id === userId) return arena.id;

  const { data: staff } = await supabase
    .from("arena_staff")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .eq("papel", "gerente")
    .eq("status", "aceito")
    .maybeSingle();
  return staff ? arena.id : null;
}

function parseHora(raw: FormDataEntryValue | null): string | null {
  const v = ((raw as string) ?? "").trim();
  return HORA_RE.test(v) ? v : null;
}

function parseValorAvulso(raw: FormDataEntryValue | null): number | null {
  const v = ((raw as string) ?? "").trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function parsePublico(formData: FormData): string {
  const raw = ((formData.get("publico") as string) ?? "").trim();
  return PUBLICOS.includes(raw) ? raw : "misto";
}

function parseDias(formData: FormData): number[] {
  return (formData.getAll("dias_semana") as string[]).map(Number).filter((n) => n >= 0 && n <= 6);
}

function parseNivel(formData: FormData): string | null {
  const raw = ((formData.get("nivel") as string) ?? "").trim();
  return NIVEIS.includes(raw) ? raw : null;
}

function parseMaxAlunos(formData: FormData): number | null {
  const raw = parseInt((formData.get("max_alunos") as string) ?? "", 10);
  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

export async function criarAula(
  _prev: AulaState,
  formData: FormData,
): Promise<AulaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const arenaIdRaw = (formData.get("arena_id") as string) ?? "";
  if (!arenaIdRaw) return { error: "Arena não informada." };

  const titulo  = ((formData.get("titulo")  as string) ?? "").trim();
  const horaInicio = parseHora(formData.get("hora_inicio"));
  const horaFim    = parseHora(formData.get("hora_fim"));
  const dias    = parseDias(formData);
  const nivel   = parseNivel(formData);
  const publico = parsePublico(formData);
  const maxAlunos = parseMaxAlunos(formData);
  const valorAvulso = parseValorAvulso(formData.get("valor_avulso"));

  if (!titulo) return { error: "Informe o título da aula." };
  const erroHorario = validarIntervaloHorario(horaInicio ?? "", horaFim ?? "");
  if (erroHorario) return { error: erroHorario };

  const arenaId = await requireManagedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return { error: "Arena não encontrada." };

  const { error } = await supabase.from("arena_classes").insert({
    arena_id:    arenaId,
    titulo,
    hora_inicio: horaInicio,
    hora_fim:    horaFim,
    horario:     horaInicio, // colunas legadas, mantidas só por compatibilidade — ver DOCUMENTACAO.md
    dias_semana: dias,
    nivel,
    publico,
    max_alunos:  maxAlunos,
    valor_avulso: valorAvulso,
  });

  if (error) return { error: "Erro ao criar a aula." };
  revalidatePath("/arena/[handle]", "layout");
  return {};
}

export async function editarAula(
  _prev: AulaState,
  formData: FormData,
): Promise<AulaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const id         = (formData.get("id") as string) ?? "";
  const arenaIdRaw = (formData.get("arena_id") as string) ?? "";
  if (!id || !arenaIdRaw) return { error: "Aula ou arena não informada." };

  const titulo  = ((formData.get("titulo")  as string) ?? "").trim();
  const horaInicio = parseHora(formData.get("hora_inicio"));
  const horaFim    = parseHora(formData.get("hora_fim"));
  const dias    = parseDias(formData);
  const nivel   = parseNivel(formData);
  const publico = parsePublico(formData);
  const maxAlunos = parseMaxAlunos(formData);
  const valorAvulso = parseValorAvulso(formData.get("valor_avulso"));
  const professorId = ((formData.get("professor_id") as string) ?? "").trim() || null;
  const ativo = formData.get("ativo") === "true";

  if (!titulo) return { error: "Informe o título da aula." };
  const erroHorario = validarIntervaloHorario(horaInicio ?? "", horaFim ?? "");
  if (erroHorario) return { error: erroHorario };

  const arenaId = await requireManagedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return { error: "Arena não encontrada." };

  // Professor precisa estar na equipe da própria arena — nunca aceita um
  // user_id qualquer vindo do formulário sem essa checagem.
  if (professorId) {
    const { data: staffRow } = await supabase
      .from("arena_staff")
      .select("id")
      .eq("arena_id", arenaId)
      .eq("user_id", professorId)
      .eq("status", "aceito")
      .maybeSingle();
    if (!staffRow) return { error: "Selecione um professor que já faça parte da equipe da arena." };
  }

  const { error, count } = await supabase
    .from("arena_classes")
    .update({
      titulo,
      hora_inicio: horaInicio,
      hora_fim:    horaFim,
      horario:     horaInicio,
      dias_semana: dias,
      nivel,
      publico,
      max_alunos: maxAlunos,
      valor_avulso: valorAvulso,
      professor_id: professorId,
      ativo,
    }, { count: "exact" })
    .eq("id", id)
    .eq("arena_id", arenaId);

  if (error || !count) return { error: "Erro ao salvar a aula." };
  revalidatePath("/arena/[handle]", "layout");
  return {};
}

// Até quantas horas antes da aula o aluno pode desmarcar presença.
export async function salvarCancelHoras(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const arenaIdRaw = (formData.get("arena_id") as string) ?? "";
  if (!arenaIdRaw) return;

  const horas = parseInt((formData.get("cancel_horas_antes") as string) ?? "", 10);
  if (!Number.isInteger(horas) || horas < 0 || horas > 72) return;

  // Regra de cancelamento é uma configuração do dono da arena (não delegada a
  // gerente), por isso checa a posse direto em vez de requireManagedArena.
  const { data: arenaCfg } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaIdRaw)
    .eq("dono_id", user.id)
    .maybeSingle();
  const arenaId = arenaCfg?.id ?? null;
  if (!arenaId) return;

  await supabase
    .from("arenas")
    .update({ cancel_horas_antes: horas })
    .eq("id", arenaId);

  revalidatePath("/arena/[handle]", "layout");
}

export async function removerAula(id: string, arenaIdRaw: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const arenaId = await requireManagedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return;

  await supabase
    .from("arena_classes")
    .delete()
    .eq("id", id)
    .eq("arena_id", arenaId);

  revalidatePath("/arena/[handle]", "layout");
}
