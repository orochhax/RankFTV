import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroDashboard } from "@/components/arena/FinanceiroDashboard";
import { getArenaFinanceiroData } from "@/lib/arena-financeiro";

export const metadata = {
  title: "Financeiro & Relatórios — RankFTV Arena",
  description: "Faturamento, presença, mensalidades e métricas da sua arena.",
};

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
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const tierId = "start";

  const {
    faturamentoPrevisto, numAlunos, receitaMensal, presencasSemanal, classesPorDia, rankingAlunos,
  } = await getArenaFinanceiroData(supabase, arena.id);

  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financeiro & Relatórios</h1>
          <p className="text-sm text-gray-400">Faturamento previsto, presenças e mensalidades da arena.</p>
        </div>

        {tierId === "start" && (
          <Link
            href={`/arena/${handle}/assinatura`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
          >
            <Sparkles className="size-3.5 text-amber-600" />
            Liberar DRE & Excel no Plano Pro
            <ArrowRight className="size-3" />
          </Link>
        )}
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
