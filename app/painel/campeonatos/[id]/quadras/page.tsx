import { notFound } from "next/navigation";
import { AlertTriangle, Radio, Timer, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { OperationalDelay } from "@/components/painel/OperationalDelay";
import { courtConflicts, type CourtMatch } from "@/lib/court-operations";
import { atualizarOperacaoPartida } from "./actions";

const STATUS_LABEL = { scheduled: "Agendada", called: "Chamada", in_progress: "Em quadra", finished: "Finalizada" } as const;

export default async function CourtOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, championship] = await Promise.all([supabase.auth.getUser(), getDbChampionshipById(id)]);
  if (!user || !championship || championship.organizadorId !== user.id) notFound();
  const admin = createAdminClient();
  const { data: rows } = await admin.from("bracket_matches")
    .select("id, category_id, round_index, match_index, participant_a_id, participant_b_id, sets_a, sets_b, court_label, scheduled_at, operational_status")
    .eq("championship_id", id).order("scheduled_at", { nullsFirst: false });
  const participantIds = [...new Set((rows ?? []).flatMap((row) => [row.participant_a_id, row.participant_b_id]).filter(Boolean))] as string[];
  const categoryIds = [...new Set((rows ?? []).map((row) => row.category_id))];
  const [{ data: participants }, { data: categories }] = await Promise.all([
    participantIds.length ? admin.from("bracket_participants").select("id, display_name_snapshot").in("id", participantIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? admin.from("championship_categories").select("id, nome").in("id", categoryIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((participants ?? []).map((item) => [item.id, item.display_name_snapshot]));
  const categoryNames = new Map((categories ?? []).map((item) => [item.id, item.nome]));
  const matches = (rows ?? []).map((row) => ({ ...row, operational_status: row.operational_status as CourtMatch["status"] }));
  const conflicts = courtConflicts(matches.map((row) => ({ id: row.id, courtLabel: row.court_label, scheduledAt: row.scheduled_at, status: row.operational_status })));

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <div><h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900"><Radio className="size-5 text-red-500" />Operação por quadra</h2><p className="text-sm text-gray-500">Organize chamadas, horários e partidas em andamento. Conflitos e atrasos aparecem antes de afetar a operação.</p></div>
      {matches.length === 0 ? <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 ring-1 ring-black/5">Gere o chaveamento para organizar as quadras.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">{matches.map((match) => (
          <form action={atualizarOperacaoPartida} key={match.id} className={`rounded-2xl bg-white p-4 ring-1 ${conflicts.has(match.id) ? "ring-red-300" : "ring-black/5"}`}>
            <input type="hidden" name="championship_id" value={id} /><input type="hidden" name="match_id" value={match.id} />
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-gray-500">{categoryNames.get(match.category_id) ?? "Categoria"} · fase {match.round_index + 1}</p><p className="mt-1 font-semibold text-gray-900">{match.participant_a_id ? names.get(match.participant_a_id) ?? "Dupla A" : "A definir"}</p><p className="text-sm text-gray-500">vs. {match.participant_b_id ? names.get(match.participant_b_id) ?? "Dupla B" : "A definir"}</p><OperationalDelay scheduledAt={match.scheduled_at} status={match.operational_status} /></div>{conflicts.has(match.id) && <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"><AlertTriangle className="size-3" />Conflito</span>}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3"><label className="text-xs text-gray-500">Quadra<input name="court_label" defaultValue={match.court_label ?? ""} placeholder="Ex.: 1" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900" /></label><label className="text-xs text-gray-500 sm:col-span-2">Horário<input type="datetime-local" name="scheduled_at" defaultValue={match.scheduled_at?.slice(0, 16) ?? ""} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900" /></label><label className="text-xs text-gray-500 sm:col-span-2">Estado<select name="status" defaultValue={match.operational_status} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Timer className="size-4" />Salvar</button></div>
          </form>
        ))}</div>
      )}
      <a href={`/campeonatos/${id}/ao-vivo`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><Trophy className="size-4" />Abrir placar público</a>
    </PageContainer>
  );
}
