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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { TierTag } from "@/components/ui/TierTag";
import { formatBRL, formatDateRangeBR } from "@/lib/format";
import { VagasProgressBar } from "@/components/painel/VagasProgressBar";
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

  // Só o organizador dono pode acessar o painel desse camp.
  if (camp.organizadorId !== user.id) notFound();

  // Rascunho ainda não tem painel de gestão — manda pro fluxo de publicação.
  if (camp.status === "rascunho") redirect(`/painel/campeonatos/${id}/criado`);

  // Tier: quiz do banco + duplas pagas (override automático)
  const [tierRes, paidRes, orgAccountRes] = await Promise.all([
    supabase.from("championships").select("tier_quiz, is_elite").eq("id", id).maybeSingle(),
    supabase.from("registrations")
      .select("valor")
      .eq("championship_id", id)
      .eq("status_pagamento", "pago"),
    supabase.from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const tierQuiz    = (tierRes.data?.tier_quiz ?? null) as Partial<QuizAnswers> | null;
  const isElite     = !!tierRes.data?.is_elite;
  const paidRows    = (paidRes.data ?? []) as { valor: number }[];
  const duplasPagas = paidRows.length;
  const totalArrecadado = paidRows.reduce((s, r) => s + Number(r.valor), 0);
  const temChavePix = !!orgAccountRes.data?.chave_pix;
  const temCategoriaPaga = camp.categorias.some((c) => (c.valorInscricao ?? 0) > 0);

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
        <StatCard label="Receita confirmada" value={formatBRL(totalArrecadado)} tone="success" icon={DollarSign} />
      </div>

      {/* Ações de gestão — imediatamente abaixo dos cards, fonte única dos hrefs é CHAMPIONSHIP_NAV_GROUPS */}
      <ChampionshipActions champId={id} />

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

      {/* Aviso: chave Pix não configurada */}
      {temCategoriaPaga && !temChavePix && (
        <Link
          href={`/painel/campeonatos/${id}/financeiro`}
          className="flex items-start gap-3 rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30 transition-colors hover:brightness-95"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
            <DollarSign className="size-5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Configure sua chave Pix</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Este campeonato tem categorias pagas, mas você ainda não configurou onde receber o dinheiro. Os atletas não conseguirão se inscrever até você configurar.
            </p>
            <p className="mt-1 text-xs font-medium text-warning">Ir para Financeiro →</p>
          </div>
        </Link>
      )}

      {/* Categorias */}
      <section>
        <SectionHeader title="Categorias" />
        <Surface padding="none" className="mt-3 overflow-hidden">
          <ol className="divide-y divide-border">
            {camp.categorias.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{cat.nome}</p>
                  <p className="text-xs capitalize text-ink-muted">{cat.genero}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {cat.maxDuplas != null && cat.maxDuplas > 0 && (
                    <span className="text-ink-muted">
                      {duplasPagas} / {cat.maxDuplas} duplas
                    </span>
                  )}
                  <span className="font-semibold text-ink">
                    {formatBRL(cat.valorInscricao)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Surface>
      </section>
    </PageContainer>
  );
}
