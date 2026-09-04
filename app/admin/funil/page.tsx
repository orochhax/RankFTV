import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChartNoAxesColumnIncreasing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { buildFunnelReport, type FunnelEventRow } from "@/lib/public-funnel-report";
import type { PublicFunnelEvent } from "@/lib/public-funnel";

const LABELS: Record<PublicFunnelEvent, string> = {
  search_used: "Busca/filtro",
  championship_viewed: "Campeonato visto",
  category_selected: "Categoria selecionada",
  athlete_data_started: "Dados iniciados",
  checkout_reviewed: "Revisão",
  payment_confirmed: "Pagamento confirmado",
};

export default async function PublicFunnelPage() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([supabase.auth.getUser(), getUserRole(supabase)]);
  if (!user || !isCeo(role)) redirect("/");
  const { data } = await createAdminClient()
    .from("public_funnel_events")
    .select("session_id, event_name, experience_version, occurred_at")
    .order("occurred_at")
    .limit(100000);
  const report = buildFunnelReport(((data ?? []) as Array<{ session_id: string; event_name: PublicFunnelEvent; experience_version: string; occurred_at: string }>).map((row): FunnelEventRow => ({
    sessionId: row.session_id,
    eventName: row.event_name,
    experienceVersion: row.experience_version,
    occurredAt: row.occurred_at,
  })));

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="size-4" />Painel admin</Link>
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900"><ChartNoAxesColumnIncreasing className="size-6 text-blue-600" />Funil público</h1><p className="mt-1 text-sm text-gray-500">Até 100 mil eventos recentes, agregados por sessão e versão, sem e-mail, CPF ou IP armazenado.</p></div>
      {report.length === 0 ? <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 ring-1 ring-black/5">A medição começa depois que a migration for aplicada e a nova versão receber visitas.</p> : report.map((version) => (
        <section key={version.version} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{version.version}</h2><p className="text-xs text-gray-500">{version.sessions} sessões medidas</p></div><p className="text-sm font-semibold text-blue-600">Conversão: {version.completionPercent}% · mediana: {version.medianCompletionMinutes ?? "—"} min</p></div>
          <div className="space-y-3">{version.stages.map((stage) => <div key={stage.event}><div className="mb-1 flex justify-between text-xs text-gray-600"><span>{LABELS[stage.event]}</span><span>{stage.sessions} · {stage.conversionPercent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${stage.conversionPercent}%` }} /></div></div>)}</div>
        </section>
      ))}
    </div>
  );
}
