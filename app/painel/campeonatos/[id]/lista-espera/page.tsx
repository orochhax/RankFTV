import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  ListaEsperaClient,
  type WaitlistEntryItem,
} from "@/components/painel/ListaEsperaClient";

export default async function WaitlistManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, championship] = await Promise.all([
    supabase.auth.getUser(),
    getDbChampionshipById(id),
  ]);
  if (!user) redirect(`/login?next=/painel/campeonatos/${id}/lista-espera`);
  if (!championship || championship.organizadorId !== user.id) notFound();

  const champId = championship.id;
  const admin = createAdminClient();
  const { data } = await admin
    .from("championship_category_waitlist")
    .select("id, category_id, email, status, created_at, invited_at, invite_expires_at")
    .eq("championship_id", champId)
    .order("created_at", { ascending: true });

  const categoryMap = new Map(championship.categorias.map((c) => [c.id, c.nome]));

  const entries: WaitlistEntryItem[] = (data ?? []).map((row) => ({
    id: String(row.id),
    categoryId: String(row.category_id),
    categoryName: categoryMap.get(String(row.category_id)) ?? "Categoria",
    email: String(row.email),
    status: row.status as WaitlistEntryItem["status"],
    createdAt: String(row.created_at),
    invitedAt: row.invited_at ? String(row.invited_at) : null,
    inviteExpiresAt: row.invite_expires_at ? String(row.invite_expires_at) : null,
  }));

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Lista de espera"
        description="Convide atletas por ordem exata de entrada (FIFO). Cada convite enviado por e-mail expira em 24 horas."
      />

      <ListaEsperaClient
        champId={champId}
        categories={championship.categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        entries={entries}
      />
    </PageContainer>
  );
}
