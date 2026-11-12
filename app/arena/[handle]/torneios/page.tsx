import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Plus, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArenaProFeatureGate } from "@/components/arena/ArenaProFeatureGate";
import { getArenaTierId } from "@/lib/arena-subscription";

export const metadata = {
  title: "Torneios Internos da Arena — RankFTV",
  description: "Crie copinhas internas e desafios Rei da Praia em 2 minutos com chaveamento automático.",
};

export default async function TorneiosArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/torneios`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) redirect("/arena");

  const [tierId, { count: totalAlunos }] = await Promise.all([
    getArenaTierId(supabase, arena.id),
    supabase
      .from("arena_students")
      .select("id", { count: "exact", head: true })
      .eq("arena_id", arena.id)
      .eq("status", "ativo"),
  ]);

  const modelosCopinha = [
    {
      titulo: "Rei da Praia — Sábado de Manhã",
      formato: "Rodízio individual com pontos corridos",
      vagas: `${Math.min(24, Math.max(12, totalAlunos ?? 16))} atletas sugeridos`,
      status: "Pronto para abrir inscrições",
    },
    {
      titulo: "Copinha Interna Misto & Iniciante",
      formato: "Fase de grupos + mata-mata em 2 quadras",
      vagas: "16 duplas balanceadas por nível",
      status: "Modelo salvo da arena",
    },
    {
      titulo: "Desafio Ranking Interno — Ranking Mensal",
      formato: "Duplas sorteadas entre alunos da turma noite",
      vagas: "Atualiza pontos internos automaticamente",
      status: "Integração ativa com placar ao vivo",
    },
  ];

  return (
    <ArenaProFeatureGate
      tierId={tierId}
      arenaHandle={handle}
      featureTitle="Torneios Internos & Rei da Praia da Arena"
      featureDescription="Engaje seus alunos criando copinhas internas e desafios Rei da Praia aos finais de semana. O RankFTV sorteia as duplas, monta os grupos e chaveamentos automaticamente e atualiza o ranking interno da arena."
      iconName="trophy"
      benefits={[
        "Chaveamento automático e sorteio de duplas balanceadas por nível",
        "Modo Rei da Praia (rodízio individual em quadra com pontuação dinâmica)",
        "Inscrições e pagamentos dos atletas direto pela plataforma",
        "Placar ao vivo interativo compatível com telões e TVs da arena",
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-ink">
                <Sparkles className="size-3" />
                Recurso Pro Ativo
              </span>
              <span className="text-xs font-medium text-ink-muted">{arena.nome}</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-black text-ink">Torneios Internos</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Engaje seus {totalAlunos ?? 0} alunos ativos com copinhas internas, sorteio de duplas e placar ao vivo.
            </p>
          </div>

          <Link
            href="/painel/novo-campeonato"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover active:scale-95"
          >
            <Plus className="size-4" />
            Criar copinha interna
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {modelosCopinha.map((modelo) => (
            <div
              key={modelo.titulo}
              className="flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-bold text-[#16A34A]">
                  <CheckCircle2 className="size-3" />
                  {modelo.status}
                </span>
                <h2 className="mt-3 text-base font-extrabold text-ink">{modelo.titulo}</h2>
                <p className="mt-1.5 text-xs text-ink-muted">{modelo.formato}</p>
              </div>
              <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-brand" />
                  <span>{modelo.vagas}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-brand" />
                  <Link href="/painel/novo-campeonato" className="font-bold text-brand hover:underline">
                    Abrir assistente de criação →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ArenaProFeatureGate>
  );
}
