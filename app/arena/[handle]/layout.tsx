import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArenaShell } from "@/components/arena/ArenaShell";

// Shell compartilhado por todas as páginas do painel do organizador
// (Início, Agenda, Alunos, Financeiro, Planos para alunos, Aulas, Relatórios,
// Plano RankFTV, Configurações, detalhe de aula). Cada página ainda revalida a
// posse da arena por handle+dono_id por conta própria (mesmo padrão já usado
// em alunos/page.tsx) — o layout só resolve o que é comum: autenticação,
// dados pra sidebar/topbar e a lista de arenas do dono pro trocador.
export default async function ArenaOrganizerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}`);

  const [{ data: arenas }, { data: profile }] = await Promise.all([
    supabase
      .from("arenas")
      .select("id, nome, handle, avatar_url")
      .eq("dono_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("nome, username").eq("id", user.id).maybeSingle(),
  ]);

  const arena = (arenas ?? []).find((a) => a.handle === handle);
  if (!arena) redirect("/arena");

  const arenaSummaries = (arenas ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    handle: a.handle,
    avatarUrl: a.avatar_url,
  }));

  return (
    <ArenaShell
      arena={{ id: arena.id, nome: arena.nome, handle: arena.handle, avatarUrl: arena.avatar_url }}
      arenas={arenaSummaries}
      user={profile ? { nome: profile.nome, username: profile.username } : null}
    >
      {children}
    </ArenaShell>
  );
}
