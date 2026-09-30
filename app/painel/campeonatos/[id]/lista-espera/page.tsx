import { notFound } from "next/navigation";
import { Clock3, MailCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { convidarProximoDaLista } from "./actions";

export default async function WaitlistManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, championship] = await Promise.all([supabase.auth.getUser(), getDbChampionshipById(id)]);
  if (!user || !championship || championship.organizadorId !== user.id) notFound();
  const admin = createAdminClient();
  const { data } = await admin.from("championship_category_waitlist").select("id, category_id, status, created_at, invite_expires_at").eq("championship_id", id).order("created_at");
  const grouped = championship.categorias.map((category) => {
    const entries = (data ?? []).filter((entry) => entry.category_id === category.id);
    return { category, waiting: entries.filter((entry) => entry.status === "waiting"), invited: entries.filter((entry) => entry.status === "invited"), converted: entries.filter((entry) => entry.status === "converted") };
  });
  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <div><h2 className="text-xl font-semibold text-gray-900">Lista de espera</h2><p className="text-sm text-gray-500">Convide uma pessoa por vez, respeitando a ordem de entrada. O convite expira em 24 horas.</p></div>
      {grouped.map(({ category, waiting, invited, converted }) => <section key={category.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{category.nome}</h3><div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><Users className="size-3" />{waiting.length} aguardando</span><span className="flex items-center gap-1"><Clock3 className="size-3" />{invited.length} convidados</span><span className="flex items-center gap-1"><MailCheck className="size-3" />{converted.length} convertidos</span></div></div>{waiting.length > 0 && <form action={convidarProximoDaLista}><input type="hidden" name="championship_id" value={id} /><input type="hidden" name="category_id" value={category.id} /><button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Convidar próximo</button></form>}</div></section>)}
    </PageContainer>
  );
}
