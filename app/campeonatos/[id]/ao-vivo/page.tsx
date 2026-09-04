import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { LiveRefresh } from "@/components/campeonatos/LiveRefresh";

export default async function LiveChampionshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const championship = await getDbChampionshipById(id);
  if (!championship) notFound();
  const admin = createAdminClient();
  const { data: rows } = await admin.from("bracket_matches").select("id, participant_a_id, participant_b_id, sets_a, sets_b, court_label, scheduled_at, operational_status").eq("championship_id", id).in("operational_status", ["called", "in_progress", "scheduled"]).order("scheduled_at", { nullsFirst: false }).limit(30);
  const ids = [...new Set((rows ?? []).flatMap((row) => [row.participant_a_id, row.participant_b_id]).filter(Boolean))] as string[];
  const { data: participants } = ids.length ? await admin.from("bracket_participants").select("id, display_name_snapshot").in("id", ids) : { data: [] };
  const names = new Map((participants ?? []).map((participant) => [participant.id, participant.display_name_snapshot]));
  const current = (rows ?? []).filter((row) => row.operational_status === "in_progress");
  const upcoming = (rows ?? []).filter((row) => row.operational_status !== "in_progress");
  const renderMatch = (match: NonNullable<typeof rows>[number]) => <article key={match.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex justify-between gap-3 text-xs text-gray-500"><span>{match.court_label ? `Quadra ${match.court_label}` : "Quadra a definir"}</span><span>{match.operational_status === "in_progress" ? "AO VIVO" : match.operational_status === "called" ? "Chamada" : match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "A definir"}</span></div><div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><p className="font-semibold text-gray-900">{match.participant_a_id ? names.get(match.participant_a_id) ?? "Dupla A" : "A definir"}</p><strong>{match.sets_a ?? "–"}</strong><p className="font-semibold text-gray-900">{match.participant_b_id ? names.get(match.participant_b_id) ?? "Dupla B" : "A definir"}</p><strong>{match.sets_b ?? "–"}</strong></div></article>;
  return <main className="min-h-screen bg-gray-50 px-4 py-6"><LiveRefresh /><div className="mx-auto max-w-2xl space-y-6"><Link href={`/campeonatos/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500"><ArrowLeft className="size-4" />Campeonato</Link><div><h1 className="text-2xl font-bold text-gray-900">{championship.nome}</h1><p className="flex items-center gap-1 text-sm text-red-600"><Radio className="size-4 animate-pulse" />Atualização automática a cada 15 segundos</p></div>{current.length > 0 && <section><h2 className="mb-3 font-semibold text-gray-900">Em quadra agora</h2><div className="space-y-3">{current.map(renderMatch)}</div></section>}<section><h2 className="mb-3 font-semibold text-gray-900">Próximas chamadas</h2><div className="space-y-3">{upcoming.length ? upcoming.map(renderMatch) : <p className="text-sm text-gray-500">Nenhuma próxima partida publicada.</p>}</div></section></div></main>;
}
