import { notFound, redirect } from "next/navigation";
import { Info, DollarSign, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { Surface } from "@/components/shell/Surface";

type Row = { status_pagamento: string; valor: number; tipo_nome: string | null; quantidade: number | null };

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

  const { data: raw } = await supabase
    .from("spectator_tickets")
    .select("status_pagamento, valor, tipo_nome, quantidade")
    .eq("championship_id", id);
  const rows: Row[] = (raw ?? []) as Row[];

  const pagos     = rows.filter((r) => r.status_pagamento === "pago");
  const pendentes = rows.filter((r) => r.status_pagamento === "pendente");
  const estornos  = rows.filter((r) => r.status_pagamento === "estornado");

  const ingressosPagos = pagos.reduce((s, r) => s + Number(r.quantidade ?? 1), 0);
  const totalPago      = pagos.reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente  = pendentes.reduce((s, r) => s + Number(r.valor), 0);
  const totalEstornado = estornos.reduce((s, r) => s + Number(r.valor), 0);

  // Por tipo (só pagos)
  const porTipo: Record<string, { count: number; total: number }> = {};
  for (const r of pagos) {
    const nome = r.tipo_nome ?? "—";
    porTipo[nome] ??= { count: 0, total: 0 };
    porTipo[nome].count += 1;
    porTipo[nome].total += Number(r.valor);
  }

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Financeiro da plateia" description="Quanto entrou só de ingressos de espectador." />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Recebido (plateia)" value={formatBRL(totalPago)} icon={DollarSign} tone="success" />
        <StatCard label="Ingressos pagos" value={ingressosPagos} icon={Ticket} />
      </div>

      <div className="flex items-start gap-2 rounded-card-lg bg-surface-2 px-3 py-2.5 ring-1 ring-border">
        <Info className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
        <p className="text-xs leading-relaxed text-ink-muted">
          A taxa de serviço é paga pelo comprador — você recebe o valor cheio de cada ingresso, na mesma chave Pix das inscrições.
        </p>
      </div>

      <section>
        <SectionHeader title="Status" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Card label="Pagos" count={pagos.length} valor={totalPago} cls="bg-blue-50 ring-blue-200 text-blue-700" />
          <Card label="Pendentes" count={pendentes.length} valor={totalPendente} cls="bg-amber-50 ring-amber-200 text-amber-700" />
          <Card label="Estornados" count={estornos.length} valor={totalEstornado} cls="bg-red-50 ring-red-200 text-red-600" />
        </div>
      </section>

      <section>
        <SectionHeader title="Arrecadação por tipo de ingresso" />
        {Object.keys(porTipo).length === 0 ? (
          <p className="mt-3 rounded-card-lg bg-surface-2 p-6 text-center text-sm text-ink-muted ring-1 ring-border">
            Nenhum ingresso pago ainda.
          </p>
        ) : (
          <Surface padding="md" className="mt-3">
            <IngressoBarChart porTipo={porTipo} />
          </Surface>
        )}
      </section>
    </PageContainer>
  );
}

function IngressoBarChart({ porTipo }: { porTipo: Record<string, { count: number; total: number }> }) {
  const entries = Object.entries(porTipo);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  return (
    <div className="space-y-4">
      {entries.map(([nome, v]) => {
        const pct = (v.total / maxTotal) * 100;
        return (
          <div key={nome} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{nome}</span>
              <span className={`font-semibold ${v.total > 0 ? "text-ink" : "text-ink-muted"}`}>
                {formatBRL(v.total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-20 text-right text-xs text-ink-muted">
                {v.count} ingresso{v.count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ label, count, valor, cls }: { label: string; count: number; valor: number; cls: string }) {
  return (
    <div className={`rounded-card-lg p-4 ring-1 ${cls}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold">{count}</p>
      <p className="text-xs opacity-70">{formatBRL(valor)}</p>
    </div>
  );
}
