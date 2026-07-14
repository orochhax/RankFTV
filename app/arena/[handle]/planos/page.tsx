import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanosAdminClient } from "@/components/arena/PlanosAdminClient";

export default async function PlanosArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/planos`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: plans } = await supabase
    .from("arena_plans")
    .select("id, tipo, nome, descricao, valor, ativo, ordem, aceita_credito, aceita_debito, dia_vencimento, aulas_por_semana")
    .eq("arena_id", arena.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Planos</h1>
        <p className="text-sm text-gray-400">Configure os planos de mensalidade e opção de aluguel da quadra.</p>
      </div>
      <PlanosAdminClient plans={plans ?? []} handle={arena.handle} />
    </div>
  );
}
