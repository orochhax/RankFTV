import { notFound, redirect } from "next/navigation";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { CompeticaoTabsHeader } from "@/components/painel/CompeticaoTabsHeader";
import {
  QuadrasBoardClient,
  type CourtBoardMatch,
} from "@/components/painel/QuadrasBoardClient";
import { courtConflicts, type CourtMatch } from "@/lib/court-operations";

export default async function CourtOperationsPage({
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
  if (!user) redirect(`/login?next=/painel/campeonatos/${id}/quadras`);
  if (!championship || championship.organizadorId !== user.id) notFound();

  const champId = championship.id;
  const publicSlug = championship.slug ?? champId;
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("bracket_matches")
    .select(
      "id, category_id, round_index, match_index, participant_a_id, participant_b_id, sets_a, sets_b, court_label, scheduled_at, operational_status",
    )
    .eq("championship_id", champId)
    .order("scheduled_at", { nullsFirst: false });

  const participantIds = [
    ...new Set(
      (rows ?? []).flatMap((row) => [row.participant_a_id, row.participant_b_id]).filter(Boolean),
    ),
  ] as string[];
  const categoryIds = [...new Set((rows ?? []).map((row) => row.category_id))];

  const [{ data: participants }, { data: categories }] = await Promise.all([
    participantIds.length
      ? admin
          .from("bracket_participants")
          .select("id, display_name_snapshot")
          .in("id", participantIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? admin.from("championship_categories").select("id, nome").in("id", categoryIds)
      : Promise.resolve({ data: [] }),
  ]);

  const names = new Map(
    (participants ?? []).map((item) => [item.id, item.display_name_snapshot]),
  );
  const categoryNames = new Map((categories ?? []).map((item) => [item.id, item.nome]));

  const matches: CourtBoardMatch[] = (rows ?? []).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: categoryNames.get(row.category_id) ?? "Categoria",
    roundIndex: row.round_index,
    matchIndex: row.match_index,
    teamA: row.participant_a_id ? (names.get(row.participant_a_id) ?? "Dupla A") : "A definir",
    teamB: row.participant_b_id ? (names.get(row.participant_b_id) ?? "Dupla B") : "A definir",
    setsA: row.sets_a,
    setsB: row.sets_b,
    courtLabel: row.court_label,
    scheduledAt: row.scheduled_at,
    status: row.operational_status as CourtMatch["status"],
  }));

  const conflicts = courtConflicts(
    matches.map((row) => ({
      id: row.id,
      courtLabel: row.courtLabel,
      scheduledAt: row.scheduledAt,
      status: row.status,
    })),
  );

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <CompeticaoTabsHeader
        champId={publicSlug}
        active="quadras"
        conflictCount={conflicts.size}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <Radio className="size-5 text-rose-500" />
            Quadro de Operação por Quadra
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Organize chamadas, distribua partidas por quadra e monitore conflitos e atrasos em tempo real.
          </p>
        </div>
      </div>

      <QuadrasBoardClient champId={champId} matches={matches} />
    </PageContainer>
  );
}
