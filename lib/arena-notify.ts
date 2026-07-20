import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Notificação in-app (best-effort — nunca bloqueia o fluxo principal que a
// chamou). Inserir aqui já atualiza sozinho o contador do sino: o layout
// raiz soma `notifications WHERE lida = false` por usuário a cada request.
export async function notificarArena(userId: string, titulo: string, mensagem: string) {
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

/** Dono + gerentes autorizados da arena — usado pra avisar quem pode agir
 *  sobre uma cobrança de aula avulsa que falhou. */
export async function notificarResponsaveisArena(
  arenaId: string,
  titulo: string,
  mensagem: string,
) {
  const admin = createAdminClient();
  const { data: arena } = await admin.from("arenas").select("dono_id").eq("id", arenaId).maybeSingle();
  const { data: gerentes } = await admin
    .from("arena_staff")
    .select("user_id")
    .eq("arena_id", arenaId)
    .eq("papel", "gerente")
    .eq("status", "aceito");

  const destinatarios = new Set<string>();
  if (arena?.dono_id) destinatarios.add(arena.dono_id);
  for (const g of gerentes ?? []) destinatarios.add(g.user_id as string);

  await Promise.all([...destinatarios].map((uid) => notificarArena(uid, titulo, mensagem)));
}
