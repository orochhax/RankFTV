import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroDashboard } from "@/components/arena/FinanceiroDashboard";
import { getArenaFinanceiroData } from "@/lib/arena-financeiro";

export default async function RelatoriosArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/relatorios`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const {
    faturamentoPrevisto, numAlunos, receitaMensal, presencasSemanal, classesPorDia, rankingAlunos,
  } = await getArenaFinanceiroData(supabase, arena.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-400">Faturamento, presença e ranking de alunos.</p>
      </div>
      <FinanceiroDashboard
        faturamentoPrevisto={faturamentoPrevisto}
        numAlunos={numAlunos}
        receitaMensal={receitaMensal}
        presencasSemanal={presencasSemanal}
        classesPorDia={classesPorDia}
        rankingAlunos={rankingAlunos}
      />
    </div>
  );
}
