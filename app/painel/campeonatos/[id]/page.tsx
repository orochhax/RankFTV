import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  Crown,
  DollarSign,
  MapPin,
  Users,
  Trophy,
  Ticket,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { TierTag } from "@/components/ui/TierTag";
import { formatBRL, formatDateRangeBR } from "@/lib/format";
import { VagasProgressBar } from "@/components/painel/VagasProgressBar";
import { ReceitaConfirmadaCard } from "@/components/painel/ReceitaConfirmadaCard";
import { ChampionshipActions } from "@/components/painel/ChampionshipActions";
import { PageContainer } from "@/components/shell/PageContainer";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { StatCard } from "@/components/shell/StatCard";
import { Surface } from "@/components/shell/Surface";
import type { QuizAnswers } from "@/lib/tier";

export default async function PainelCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  const champId = camp.id;

  // Só o organizador dono pode acessar o painel desse camp.
  if (camp.organizadorId !== user.id) notFound();

  // Rascunho ainda não tem painel de gestão — manda pro fluxo de publicação.
  if (camp.status === "rascunho") redirect(`/painel/campeonatos/${champId}/criado`);

  // Tier: quiz do banco + duplas pagas (override automático).
  // Duplas pagas somam DUAS fontes: registrations (dupla autenticada,
  // /campeonatos/[id]/inscrever) e athlete_tickets (checkout de visitante,
  // botão "Sou atleta" -> /campeonatos/[id]/comprar). Esta segunda é hoje
  // o fluxo realmente usado pelo botão público — sem somar aqui o painel
  // mostrava R$0/zero inscrições mesmo com Pix confirmado.
  const [tierRes, financialMetricsRes, orgAccountRes, spectatorRes] = await Promise.all([
    supabase.from("championships").select("tier_quiz, is_elite").eq("id", champId).maybeSingle(),
    supabase.rpc("organizer_championship_financial_metrics", { p_championship_id: champId }),
    supabase.from("organizer_accounts")
      .select("chave_pix, status_verificacao, motivo_rejeicao")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("spectator_tickets")
      .select("valor")
      .eq("championship_id", champId)
      .eq("status_pagamento", "pago"),
  ]);
  const tierQuiz    = (tierRes.data?.tier_quiz ?? null) as Partial<QuizAnswers> | null;
  const isElite     = !!tierRes.data?.is_elite;
  const financialMetrics = (financialMetricsRes.data ?? {}) as {
    statuses?: Array<{ status: string; count: number; total: number }>;
    categories?: Array<{ id?: string; category_id?: string; name: string; gender: string | null; count: number; total: number }>;
  };
  const paidMetric = financialMetrics.statuses?.find((item) => item.status === "pago");
  const duplasPagas = Number(paidMetric?.count ?? 0);
  const totalArrecadado = Number(paidMetric?.total ?? 0);
  const totalPlateia = (spectatorRes.data ?? []).reduce((acc, t) => acc + Number(t.valor || 0), 0);
  const totalGeralConfirmado = totalArrecadado + totalPlateia;
  const temChavePix = !!orgAccountRes.data?.chave_pix;
  const temCategoriaPaga = camp.categorias.some((c) => (c.valorInscricao ?? 0) > 0);

  const categoryCounts = Object.fromEntries(
    (financialMetrics.categories ?? []).map((c) => [c.id ?? c.category_id ?? "", Number(c.count)]),
  );

  const vagasTotais = camp.categorias.reduce(
    (acc, c) => acc + (c.maxDuplas ?? 0),
    0,
  );
  const totalPotencial = camp.categorias.reduce(
    (acc, c) => acc + ((c.maxDuplas ?? 0) * (c.valorInscricao ?? 0)),
    0,
  );

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      {/* Info + tier — o shell já cobre nome/status/breadcrumb */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
        <span className="flex items-center gap-1">
          <CalendarDays className="size-4" />
          {formatDateRangeBR(camp.dataInicio, camp.dataFim)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="size-4" />
          {camp.cidade} — {camp.estado}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isElite ? "bg-amber-100 text-amber-700" : "bg-surface-2 text-ink-muted"
          }`}
        >
          {isElite && <Crown className="size-3.5" />}
          {isElite ? "Elite" : "Padrão"}
        </span>
        <TierTag quiz={tierQuiz} duplasPagas={duplasPagas} />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Duplas inscritas" value={duplasPagas} icon={Users} />
        <StatCard label="Categorias" value={camp.categorias.length} icon={Trophy} />
        <StatCard label="Vagas totais" value={vagasTotais > 0 ? vagasTotais : "—"} icon={Ticket} />
        <ReceitaConfirmadaCard
          totalGeralConfirmado={totalGeralConfirmado}
          totalArrecadado={totalArrecadado}
          totalPlateia={totalPlateia}
        />
      </div>

      {/* Ações de gestão — imediatamente abaixo dos cards, fonte única dos hrefs é CHAMPIONSHIP_NAV_GROUPS */}
      <ChampionshipActions champId={champId} />

      {(duplasPagas > 0 || vagasTotais > 0) && (
        <Surface padding="md">
          <VagasProgressBar
            duplasPagas={duplasPagas}
            vagasTotais={vagasTotais}
            totalArrecadado={totalArrecadado}
            totalPotencial={totalPotencial}
          />
        </Surface>
      )}

      {/* Aviso: chave Pix ou verificação KYC pendente */}
      {temCategoriaPaga && (
        orgAccountRes.data?.status_verificacao === "em_analise" ? (
          <div className="flex items-start gap-3 rounded-card-lg bg-blue-50 p-4 ring-1 ring-blue-200">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <Clock className="size-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-blue-900">Documentos em análise de segurança</p>
              <p className="mt-0.5 text-sm text-blue-800">
                Seus dados e documentos estão sendo conferidos pela equipe da RankFTV. Assim que aprovados, você poderá publicar e receber os pagamentos normalmente.
              </p>
            </div>
          </div>
        ) : orgAccountRes.data?.status_verificacao === "rejeitado" ? (
          <Link
            href={`/perfil/ativar-organizador?champId=${id}`}
            className="flex items-start gap-3 rounded-card-lg bg-rose-50 p-4 ring-1 ring-rose-200 transition-colors hover:brightness-95"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <AlertTriangle className="size-5 text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-rose-900">Pendência nos documentos do organizador</p>
              <p className="mt-0.5 text-sm text-rose-800">
                {orgAccountRes.data?.motivo_rejeicao || "Por favor, reenvie seus documentos para liberar as vendas."}
              </p>
              <p className="mt-1 text-xs font-semibold text-rose-700">Reenviar documentos agora →</p>
            </div>
          </Link>
        ) : (!temChavePix || orgAccountRes.data?.status_verificacao !== "aprovado") ? (
          <Link
            href={`/perfil/ativar-organizador?champId=${id}`}
            className="flex items-start gap-3 rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30 transition-colors hover:brightness-95"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <DollarSign className="size-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Configure seu recebimento e envie seus documentos</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Este campeonato tem categorias pagas. Para receber o dinheiro e liberar as vendas, cadastre sua chave Pix e envie seus documentos de identificação.
              </p>
              <p className="mt-1 text-xs font-medium text-warning">Configurar recebimento agora →</p>
            </div>
          </Link>
        ) : null
      )}

      {/* Categorias */}
      <section>
        <SectionHeader title="Categorias" />
        <Surface padding="none" className="mt-3 overflow-hidden">
          <ol className="divide-y divide-border">
            {camp.categorias.map((cat) => {
              const catDuplas = categoryCounts[cat.id] ?? 0;
              return (
                <li key={cat.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{cat.nome}</p>
                    <p className="text-xs capitalize text-ink-muted">{cat.genero}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {cat.maxDuplas != null && cat.maxDuplas > 0 && (
                      <span className="text-ink-muted">
                        {catDuplas} / {cat.maxDuplas} duplas
                      </span>
                    )}
                    <span className="font-semibold text-ink">
                      {formatBRL(cat.valorInscricao)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Surface>
      </section>
    </PageContainer>
  );
}
