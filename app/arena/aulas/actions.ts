"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AulaState = { error?: string };

const NIVEIS = ["iniciante", "intermediario", "avancado"];
const DURACAO_PADRAO = 60;
const DURACAO_MIN = 15;
const DURACAO_MAX = 480;

// Confirma que `arenaId` existe e pertence ao usuário logado. Nunca confia
// cegamente num "a primeira arena do dono" — obrigatório quando o mesmo
// dono tem mais de uma arena, senão a ação pode ler/escrever na arena
// errada.
async function requireOwnedArena(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  arenaId: string,
) {
  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .eq("dono_id", userId)
    .maybeSingle();
  return arena?.id ?? null;
}

function parseDuracao(raw: FormDataEntryValue | null): number {
  const n = parseInt((raw as string) ?? "", 10);
  if (!Number.isInteger(n) || n < DURACAO_MIN || n > DURACAO_MAX) return DURACAO_PADRAO;
  return n;
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
  const horario = ((formData.get("horario") as string) ?? "").trim();
  const dias    = parseDias(formData);
  const nivel   = parseNivel(formData);
  const maxAlunos = parseMaxAlunos(formData);
  const duracaoMinutos = parseDuracao(formData.get("duracao_minutos"));

  if (!titulo) return { error: "Informe o título da aula." };

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return { error: "Arena não encontrada." };

  const { error } = await supabase.from("arena_classes").insert({
    arena_id:    arenaId,
    titulo,
    horario:     horario || null,
    dias_semana: dias,
    nivel,
    max_alunos:  maxAlunos,
    duracao_minutos: duracaoMinutos,
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
  const horario = ((formData.get("horario") as string) ?? "").trim();
  const dias    = parseDias(formData);
  const nivel   = parseNivel(formData);
  const maxAlunos = parseMaxAlunos(formData);
  const duracaoMinutos = parseDuracao(formData.get("duracao_minutos"));
  const ativo = formData.get("ativo") === "true";

  if (!titulo) return { error: "Informe o título da aula." };

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return { error: "Arena não encontrada." };

  const { error, count } = await supabase
    .from("arena_classes")
    .update({
      titulo,
      horario: horario || null,
      dias_semana: dias,
      nivel,
      max_alunos: maxAlunos,
      duracao_minutos: duracaoMinutos,
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

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
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

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return;

  await supabase
    .from("arena_classes")
    .delete()
    .eq("id", id)
    .eq("arena_id", arenaId);

  revalidatePath("/arena/[handle]", "layout");
}
