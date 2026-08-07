import { DollarSign, Info, Ticket } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { StatCard } from "@/components/shell/StatCard";
import { Surface } from "@/components/shell/Surface";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type StatusMetric = { status: string; orders: number; quantity: number; total: number };
type TypeMetric = { name: string; quantity: number; total: number };

export default async function FinanceiroPlateiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const { data } = await supabase.rpc("organizer_spectator_financial_metrics", {
    p_championship_id: id,
  });
  const metrics = (data ?? {}) as { statuses?: StatusMetric[]; ticketTypes?: TypeMetric[] };
  const status = (value: string) => metrics.statuses?.find((item) => item.status === value);
  const paid = status("pago");
  const pending = status("pendente");
  const refunded = status("estornado");
  const paidTotal = Number(paid?.total ?? 0);
  const byType: Record<string, { count: number; total: number }> = Object.fromEntries(
    (metrics.ticketTypes ?? []).map((item) => [item.name, {
      count: Number(item.quantity),
      total: Number(item.total),
    }])
  );

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Financeiro da plateia" description="Quanto entrou só de ingressos de espectador." />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Recebido (plateia)" value={formatBRL(paidTotal)} icon={DollarSign} tone="success" />
        <StatCard label="Ingressos pagos" value={Number(paid?.quantity ?? 0)} icon={Ticket} />
      </div>

      <div className="flex items-start gap-2 rounded-card-lg bg-surface-2 px-3 py-2.5 ring-1 ring-border">
        <Info className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
        <p className="text-xs leading-relaxed text-ink-muted">
          A taxa de serviço é paga pelo comprador. Você recebe o valor dos ingressos na mesma chave Pix das inscrições.
        </p>
      </div>

      <section>
        <SectionHeader title="Status" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <MetricCard label="Pagos" count={Number(paid?.orders ?? 0)} value={paidTotal} className="bg-blue-50 ring-blue-200 text-blue-700" />
          <MetricCard label="Pendentes" count={Number(pending?.orders ?? 0)} value={Number(pending?.total ?? 0)} className="bg-amber-50 ring-amber-200 text-amber-700" />
          <MetricCard label="Estornados" count={Number(refunded?.orders ?? 0)} value={Number(refunded?.total ?? 0)} className="bg-red-50 ring-red-200 text-red-600" />
        </div>
      </section>

      <section>
        <SectionHeader title="Arrecadação por tipo de ingresso" />
        {Object.keys(byType).length === 0 ? (
          <p className="mt-3 rounded-card-lg bg-surface-2 p-6 text-center text-sm text-ink-muted ring-1 ring-border">
            Nenhum ingresso pago ainda.
          </p>
        ) : (
          <Surface padding="md" className="mt-3">
            <TicketTypeChart values={byType} />
          </Surface>
        )}
      </section>
    </PageContainer>
  );
}

function TicketTypeChart({ values }: { values: Record<string, { count: number; total: number }> }) {
  const entries = Object.entries(values);
  const maxTotal = Math.max(...entries.map(([, item]) => item.total), 1);
  return (
    <div className="space-y-4">
      {entries.map(([name, item]) => (
        <div key={name} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">{name}</span>
            <span className="font-semibold text-ink">{formatBRL(item.total)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${(item.total / maxTotal) * 100}%` }} />
            </div>
            <span className="w-20 text-right text-xs text-ink-muted">
              {item.count} ingresso{item.count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  count,
  value,
  className,
}: {
  label: string;
  count: number;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-card-lg p-4 ring-1 ${className}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold">{count}</p>
      <p className="text-xs opacity-70">{formatBRL(value)}</p>
    </div>
  );
}
