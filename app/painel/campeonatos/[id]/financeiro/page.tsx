import { notFound, redirect } from "next/navigation";
import { FinanceiroConteudoClient } from "@/components/painel/FinanceiroConteudoClient";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { ChavePixClient } from "@/components/painel/ChavePixClient";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

type RegRow = {
  id: string;
  valor: number;
  status_pagamento: "pago" | "pendente" | "estornado";
  billing_type: string | null;
  category_id: string;
  created_at: string;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

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

  const [{ data: rawRegs }, { data: champDates }] = await Promise.all([
    supabase
      .from("registrations")
      .select(`id, valor, status_pagamento, billing_type, category_id, created_at, championship_categories(id, nome, genero)`)
      .eq("championship_id", id),
    supabase
      .from("championships")
      .select("prevenda_inicio, inscricoes_inicio, data_inicio")
      .eq("id", id)
      .single(),
  ]);

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  const totalPago      = regs.filter((r) => r.status_pagamento === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente  = regs.filter((r) => r.status_pagamento === "pendente").reduce((s, r) => s + Number(r.valor), 0);
  const totalEstornado = regs.filter((r) => r.status_pagamento === "estornado").reduce((s, r) => s + Number(r.valor), 0);
  // Elite: a ativação é descontada dos repasses — saldo pode ficar negativo até quitar.
  const repasseLiquido = isElite ? totalPago - feePendente : totalPago;

  type CatSummary = { nome: string; genero: string; count: number; total: number };
  const catMap: Record<string, CatSummary> = {};
  for (const r of regs) {
    if (!r.championship_categories) continue;
    const catId = r.category_id;
    if (!catMap[catId]) catMap[catId] = { nome: r.championship_categories.nome, genero: r.championship_categories.genero, count: 0, total: 0 };
    if (r.status_pagamento === "pago") { catMap[catId].count += 1; catMap[catId].total += Number(r.valor); }
  }

  const pagas = regs.filter((r) => r.status_pagamento === "pago");
  const totalPix     = pagas.filter((r) => r.billing_type === "PIX").reduce((s, r) => s + Number(r.valor), 0);
  const totalCredito = pagas.filter((r) => r.billing_type === "CREDIT_CARD").reduce((s, r) => s + Number(r.valor), 0);
  const totalDebito  = pagas.filter((r) => r.billing_type === "DEBIT_CARD").reduce((s, r) => s + Number(r.valor), 0);

  const STATUS_CARDS = [
    {
      slug:  "pagos",
      label: "Pagos",
      count: regs.filter((r) => r.status_pagamento === "pago").length,
      valor: totalPago,
      bg:    "bg-blue-50",
      ring:  "ring-blue-200",
      text:  "text-blue-700",
    },
    {
      slug:  "pendentes",
      label: "Pendentes",
      count: regs.filter((r) => r.status_pagamento === "pendente").length,
      valor: totalPendente,
      bg:    "bg-amber-50",
      ring:  "ring-amber-200",
      text:  "text-amber-700",
    },
    {
      slug:  "estornados",
      label: "Estornados",
      count: regs.filter((r) => r.status_pagamento === "estornado").length,
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
    const pagasSorted = regs
      .filter((r) => r.status_pagamento === "pago")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    // Início: prevenda_inicio → inscricoes_inicio → primeira venda → hoje
    const candidatos = [
      champDates?.prevenda_inicio,
      champDates?.inscricoes_inicio,
      pagasSorted[0]?.created_at.slice(0, 10),
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
    for (const r of pagasSorted) {
      const dia = r.created_at.slice(0, 10);
      if (!diasMap[dia]) diasMap[dia] = { total: 0, count: 0 };
      diasMap[dia].total += Number(r.valor);
      diasMap[dia].count += 1;
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

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Financeiro" description="Entradas, taxas e repasses desse campeonato." />
      <ChavePixClient chavePix={chavePix} />
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
      />
      <PlanoTaxas champId={id} isElite={isElite} status={camp.status} feePendente={feePendente} permitirCancelar />
    </PageContainer>
  );
}
