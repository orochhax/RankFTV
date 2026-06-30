import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";

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
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}/plateia`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Gestão de Espectadores
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro da plateia</h1>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <p className="text-xs text-blue-400">Recebido (plateia)</p>
              <p className="mt-1 text-xl font-bold text-blue-300">{formatBRL(totalPago)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Ingressos pagos</p>
              <p className="mt-1 text-xl font-bold text-white">{ingressosPagos}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/30">
              A taxa de serviço é paga pelo comprador — você recebe o valor cheio de cada ingresso, na mesma chave Pix das inscrições.
            </p>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card label="Pagos" count={pagos.length} valor={totalPago} cls="bg-blue-50 ring-blue-200 text-blue-700" />
              <Card label="Pendentes" count={pendentes.length} valor={totalPendente} cls="bg-amber-50 ring-amber-200 text-amber-700" />
              <Card label="Estornados" count={estornos.length} valor={totalEstornado} cls="bg-red-50 ring-red-200 text-red-600" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Arrecadação por tipo de ingresso</h2>
            {Object.keys(porTipo).length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhum ingresso pago ainda.
              </p>
            ) : (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <IngressoBarChart porTipo={porTipo} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
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
              <span className="font-medium text-gray-800">{nome}</span>
              <span className={`font-semibold ${v.total > 0 ? "text-gray-900" : "text-gray-300"}`}>
                {formatBRL(v.total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-20 text-right text-xs text-gray-400">
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
    <div className={`rounded-2xl p-4 ring-1 ${cls}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold">{count}</p>
      <p className="text-xs opacity-70">{formatBRL(valor)}</p>
    </div>
  );
}
