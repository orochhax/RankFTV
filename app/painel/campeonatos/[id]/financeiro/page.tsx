import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FinanceiroConteudoClient } from "@/components/painel/FinanceiroConteudoClient";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { ChavePixClient } from "@/components/painel/ChavePixClient";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";

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

  // Gráfico de vendas diárias — do início da pré-venda (ou inscrição) até hoje
  const dataInicioChart =
    champDates?.prevenda_inicio ??
    champDates?.inscricoes_inicio ??
    champDates?.data_inicio ??
    camp.dataInicio;

  const vendasDiarias: DiaVenda[] = (() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(dataInicioChart + "T00:00:00");
    if (inicio > hoje) return [];

    const diasMap: Record<string, { total: number; count: number }> = {};
    for (const r of regs) {
      if (r.status_pagamento !== "pago") continue;
      const dia = r.created_at.slice(0, 10);
      if (!diasMap[dia]) diasMap[dia] = { total: 0, count: 0 };
      diasMap[dia].total += Number(r.valor);
      diasMap[dia].count += 1;
    }

    const result: DiaVenda[] = [];
    const cur = new Date(inicio);
    while (cur <= hoje) {
      const iso = cur.toISOString().slice(0, 10);
      const [, m, d] = iso.split("-");
      result.push({
        data: iso,
        label: `${d}/${m}`,
        total: diasMap[iso]?.total ?? 0,
        count: diasMap[iso]?.count ?? 0,
      });
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
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href={`/painel/campeonatos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          <ChavePixClient chavePix={chavePix} />
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">
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
        </div>
      </div>
    </div>
  );
}
