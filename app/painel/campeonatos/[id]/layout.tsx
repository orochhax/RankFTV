import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { ChampionshipShell } from "@/components/painel/ChampionshipShell";

// Dono da navegação contextual de um campeonato: confirma sessão + posse
// antes de qualquer página abaixo renderizar, e passa pro shell só o mínimo
// necessário pra montar a navegação (id/nome/status) — nunca o campeonato
// inteiro (categorias, regulamento etc. continuam sendo responsabilidade de
// cada página buscar do jeito que já busca).
export default async function CampeonatoLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/painel/campeonatos/${id}`);

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  return (
    <ChampionshipShell champ={{ id: camp.id, nome: camp.nome, status: camp.status }}>
      {children}
    </ChampionshipShell>
  );
}
