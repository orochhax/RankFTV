import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroArenaClient } from "@/components/arena/FinanceiroArenaClient";
import { getArenaFinanceiroData } from "@/lib/arena-financeiro";

export default async function FinanceiroArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/financeiro`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { mesAtual, alunosComSituacao } = await getArenaFinanceiroData(supabase, arena.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Competência: {mesAtual.slice(5)}/{mesAtual.slice(0, 4)}
        </p>
        <h1 className="text-xl font-bold text-gray-900">Cobranças do mês</h1>
      </div>
      <FinanceiroArenaClient alunos={alunosComSituacao} mesAtual={mesAtual} />
    </div>
  );
}
