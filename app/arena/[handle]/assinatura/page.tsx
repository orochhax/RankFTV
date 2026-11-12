import { redirect } from "next/navigation";
import { CheckCircle2, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArenaPlansComparison } from "@/components/arena/ArenaPlansComparison";
import { avaliarCapacidadeArena } from "@/lib/arena-platform-plans";
import { getArenaTierId } from "@/lib/arena-subscription";

export const metadata = {
  title: "Plano e Limites da Arena — RankFTV",
  description: "Gerencie o plano da sua arena, consulte limites de alunos e faça upgrade para o Plano Pro.",
};

async function carregarDadosArenaAssinatura(handle: string, userId: string) {
  const supabase = await createClient();
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) return null;

  const isOwner = arena.dono_id === userId;
  if (!isOwner) {
    const { data: staff } = await supabase
      .from("arena_staff")
      .select("id")
      .eq("arena_id", arena.id)
      .eq("user_id", userId)
      .eq("papel", "gerente")
      .eq("status", "aceito")
      .maybeSingle();
    if (!staff) return null;
  }

  const { count: totalAlunosAtivos } = await supabase
    .from("arena_students")
    .select("id", { count: "exact", head: true })
    .eq("arena_id", arena.id)
    .eq("status", "ativo");

  return { arena, totalAtivos: totalAlunosAtivos ?? 0 };
}

export default async function ArenaAssinaturaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/assinatura`);

  const dados = await carregarDadosArenaAssinatura(handle, user.id);
  if (!dados) redirect(`/arena/${handle}`);

  const { arena, totalAtivos } = dados;
  const tierId = await getArenaTierId(supabase, arena.id);
  const capacidade = avaliarCapacidadeArena(totalAtivos, tierId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink">
              <Sparkles className="size-3 text-brand" />
              SaaS Arenas RankFTV
            </span>
            <span className="text-xs font-medium text-gray-500">
              {arena.nome}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Plano e Capacidade da Arena
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Acompanhe o uso de alunos ativos no seu plano e desbloqueie capacidade ilimitada com automações exclusivas no Plano Pro.
          </p>
        </div>

        {/* Resumo rápido de capacidade em pill */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm md:mt-0">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <Users className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <span>Alunos Ativos</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  tierId === "pro"
                    ? "bg-accent text-accent-ink"
                    : "bg-gray-200/80 text-gray-800"
                }`}
              >
                {tierId === "pro" ? "Plano Pro" : "Plano Start"}
              </span>
            </div>
            <p className="text-lg font-black text-gray-900">
              {totalAtivos}{" "}
              <span className="text-xs font-normal text-gray-400">
                {tierId === "pro" ? "/ Ilimitado" : "/ 30 vagas"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Status de Capacidade */}
      {tierId === "pro" ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-dark p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">
                Plano Pro ativo · Alunos ilimitados e R$ 0 por matrícula
              </p>
              <p className="mt-0.5 text-xs text-app-bg/80">
                Radar Anti-Evasão, Torneios Internos, Selo de Verificado e DRE completo de 12 meses estão desbloqueados para {arena.nome}.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-ink">
            ⭐ Todos os recursos liberados
          </span>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>Ocupação do Plano Start (Teto de 30 Alunos)</span>
            <span className={capacidade.isBloqueado ? "text-orange-600" : capacidade.isAviso ? "text-amber-600" : "text-gray-600"}>
              {capacidade.percentualOcupacao}% utilizado ({capacidade.vagasRestantes ?? 0} vagas livres)
            </span>
          </div>
          <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full transition-all duration-500 ${
                capacidade.isBloqueado
                  ? "bg-orange-500"
                  : capacidade.isAviso
                  ? "bg-amber-500"
                  : "bg-brand"
              }`}
              style={{ width: `${Math.min(100, capacidade.percentualOcupacao)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {capacidade.isBloqueado
              ? "⚠️ Limite de 30 alunos atingido. Novas matrículas pelo site estão pausadas até o upgrade para o Plano Pro."
              : capacidade.isAviso
              ? `⚠️ Restam apenas ${capacidade.vagasRestantes} vagas antes do bloqueio de novas matrículas. Faça o upgrade preventivo para o Plano Pro.`
              : "No Plano Start você paga apenas R$ 4,90 por aluno ativo por mês (recorrente). Ao passar de 25 alunos, considere migrar para o Pro para economizar."}
          </p>
        </div>
      )}

      {/* Tabela e Cards Comparativos de Planos */}
      <div className="mt-8">
        <ArenaPlansComparison currentTier={tierId} arenaHandle={handle} />
      </div>
    </div>
  );
}
