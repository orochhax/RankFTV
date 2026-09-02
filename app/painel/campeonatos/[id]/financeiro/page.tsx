import { notFound, redirect } from "next/navigation";
import { FinanceiroConteudoClient } from "@/components/painel/FinanceiroConteudoClient";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { ChavePixClient } from "@/components/painel/ChavePixClient";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";
import { ReconciliarInscricaoButton } from "@/components/painel/ReconciliarInscricaoButton";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { Surface } from "@/components/shell/Surface";
import { formatBRL } from "@/lib/format";

export type DiaVenda = {
  data: string;   // "2026-06-01"
  label: string;  // "01/06"
  total: number;
  count: number;
};

export default async function FinanceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const [{ data: orgAccount }, { data: champExtra }] = await Promise.all([
    supabase.from("organizer_accounts").select("chave_pix").eq("user_id", user.id).maybeSingle(),
    supabase.from("championships").select("is_elite, premium_fee_pendente").eq("id", id).maybeSingle(),
  ]);

  const chavePix    = orgAccount?.chave_pix ?? null;
  const isElite     = !!champExtra?.is_elite;
  const feePendente = Number(champExtra?.premium_fee_pendente ?? 0);

  const [{ data: metricData }, { data: champDates }, { data: rawPendentes }, { data: rawPendentesTickets }] = await Promise.all([
    supabase.rpc("organizer_championship_financial_metrics", { p_championship_id: id }),
    supabase
      .from("championships")
      .select("prevenda_inicio, inscricoes_inicio, data_inicio")
      .eq("id", id)
      .single(),
    // Pendentes com cobrança já criada no Asaas — candidatas a reconciliação
    // manual (webhook que talvez nunca tenha chegado). Ver 7.4/Bug 3.
    supabase
      .from("registrations")
      .select("id, valor, created_at, teams(atleta1_id)")
      .eq("championship_id", id)
      .eq("status_pagamento", "pendente")
      .not("asaas_payment_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("athlete_tickets")
      .select("id, valor, created_at, comprador_nome")
      .eq("championship_id", id)
      .eq("status_pagamento", "pendente")
      .not("asaas_payment_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  type StatusMetric = { status: string; count: number; total: number };
  type BillingMetric = { type: string | null; total: number };
  type CategoryMetric = { id: string; name: string; gender: string | null; count: number; total: number };
  type DailyMetric = { day: string; count: number; total: number };
  const metrics = (metricData ?? {}) as {
    statuses?: StatusMetric[];
    billing?: BillingMetric[];
    categories?: CategoryMetric[];
    daily?: DailyMetric[];
  };

  type PendenteRow = { id: string; valor: number; created_at: string; teams: { atleta1_id: string } | null };
  const pendentesComCobranca = (rawPendentes ?? []) as unknown as PendenteRow[];
  const atleta1IdsPendentes = [...new Set(pendentesComCobranca.map((p) => p.teams?.atleta1_id).filter(Boolean))] as string[];
  const { data: profilesPendentes } = atleta1IdsPendentes.length > 0
    ? await supabase.from("profiles").select("id, nome").in("id", atleta1IdsPendentes)
    : { data: [] };
  const nomeAtleta1Map = Object.fromEntries((profilesPendentes ?? []).map((p) => [p.id, p.nome]));

  type PendenteTicketRow = { id: string; valor: number; created_at: string; comprador_nome: string };
  const pendentesTicketsComCobranca = (rawPendentesTickets ?? []) as unknown as PendenteTicketRow[];

  const statusMetric = (status: string) => metrics.statuses?.find((item) => item.status === status);
  const totalPago = Number(statusMetric("pago")?.total ?? 0);
  const totalPendente = Number(statusMetric("pendente")?.total ?? 0);
  const totalEstornado = Number(statusMetric("estornado")?.total ?? 0);
  // Elite: a ativação é descontada dos repasses — saldo pode ficar negativo até quitar.
  const repasseLiquido = isElite ? totalPago - feePendente : totalPago;

  type CatSummary = { nome: string; genero: string; count: number; total: number };
  const catMap: Record<string, CatSummary> = Object.fromEntries(
    (metrics.categories ?? []).map((category) => [category.id, {
      nome: category.name,
      genero: category.gender ?? "",
      count: Number(category.count),
      total: Number(category.total),
    }])
  );

  const billingTotal = (type: string) => Number(metrics.billing?.find((item) => item.type === type)?.total ?? 0);
  const totalPix = billingTotal("PIX");
  const totalCredito = billingTotal("CREDIT_CARD");
  const totalDebito = billingTotal("DEBIT_CARD");

  const STATUS_CARDS = [
    {
      slug:  "pagos",
      label: "Pagos",
      count: Number(statusMetric("pago")?.count ?? 0),
      valor: totalPago,
      bg:    "bg-blue-50",
      ring:  "ring-blue-200",
      text:  "text-blue-700",
    },
    {
      slug:  "pendentes",
      label: "Pendentes",
      count: Number(statusMetric("pendente")?.count ?? 0),
      valor: totalPendente,
      bg:    "bg-amber-50",
      ring:  "ring-amber-200",
      text:  "text-amber-700",
    },
    {
      slug:  "estornados",
      label: "Estornados",
      count: Number(statusMetric("estornado")?.count ?? 0),
      valor: totalEstornado,
      bg:    "bg-red-50",
      ring:  "ring-red-200",
      text:  "text-red-600",
    },
  ];

  // Gráfico de vendas diárias — do início da pré-venda (ou inscrição) até hoje.
  // Usa formatação local para evitar bug de timezone com toISOString().
  function isoLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  const vendasDiarias: DiaVenda[] = (() => {
    const dailyMetrics = metrics.daily ?? [];

    // Início: prevenda_inicio → inscricoes_inicio → primeira venda → hoje
    const candidatos = [
      champDates?.prevenda_inicio,
      champDates?.inscricoes_inicio,
      dailyMetrics[0]?.day.slice(0, 10),
    ].filter(Boolean) as string[];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeIso = isoLocal(hoje);

    const inicioStr = candidatos.length > 0
      ? candidatos.reduce((a, b) => (a < b ? a : b)) // menor data
      : hojeIso;

    const inicio = new Date(inicioStr + "T00:00:00");
    if (inicio > hoje) return [];

    const diasMap: Record<string, { total: number; count: number }> = {};
    for (const item of dailyMetrics) {
      const day = item.day.slice(0, 10);
      diasMap[day] = { total: Number(item.total), count: Number(item.count) };
    }

    const result: DiaVenda[] = [];
    const cur = new Date(inicio);
    while (isoLocal(cur) <= hojeIso) {
      const iso = isoLocal(cur);
      const [, m, d] = iso.split("-");
      result.push({ data: iso, label: `${d}/${m}`, total: diasMap[iso]?.total ?? 0, count: diasMap[iso]?.count ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  })();

  const categorias = camp.categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    genero: c.genero,
    valorInscricao: c.valorInscricao,
  }));

  const cobrancasPendentesSection = (
    pendentesComCobranca.length > 0 || pendentesTicketsComCobranca.length > 0
  ) ? (
    <Surface padding="md" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Cobranças pendentes</h2>
        <p className="text-xs text-ink-muted">
          O pagamento pode ter sido feito, mas a confirmação automática ainda não
          chegou. Verifique o status real no processador de pagamentos antes de considerar
          como falha — isso nunca edita o registro na mão, apenas sincroniza a resposta oficial.
        </p>
      </div>
      <div className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain pr-1">
        {pendentesComCobranca.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {p.teams?.atleta1_id ? (nomeAtleta1Map[p.teams.atleta1_id] ?? "Atleta") : "Atleta"}
              </p>
              <p className="text-xs text-ink-muted">{formatBRL(Number(p.valor))}</p>
            </div>
            <ReconciliarInscricaoButton champId={id} registrationId={p.id} />
          </div>
        ))}
        {pendentesTicketsComCobranca.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{p.comprador_nome}</p>
              <p className="text-xs text-ink-muted">{formatBRL(Number(p.valor))}</p>
            </div>
            <ReconciliarInscricaoButton champId={id} registrationId={p.id} tipo="athlete_ticket" />
          </div>
        ))}
      </div>
    </Surface>
  ) : null;

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Financeiro" description="Entradas, taxas e repasses desse campeonato." />

      <FinanceiroConteudoClient
        champId={id}
        repasseLiquido={repasseLiquido}
        statusCards={STATUS_CARDS}
        totalPix={totalPix}
        totalCredito={totalCredito}
        totalDebito={totalDebito}
        categorias={categorias}
        catMap={catMap}
        isElite={isElite}
        feePendente={feePendente}
        vendasDiarias={vendasDiarias}
        chavePixSection={<ChavePixClient chavePix={chavePix} />}
        cobrancasPendentesSection={cobrancasPendentesSection}
      />
      <PlanoTaxas champId={id} isElite={isElite} status={camp.status} feePendente={feePendente} permitirCancelar />
    </PageContainer>
  );
}
