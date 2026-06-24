import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
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
  championship_categories: { id: string; nome: string; genero: string } | null;
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

  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`id, valor, status_pagamento, billing_type, category_id, championship_categories(id, nome, genero)`)
    .eq("championship_id", id);

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  const totalPago      = regs.filter((r) => r.status_pagamento === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente  = regs.filter((r) => r.status_pagamento === "pendente").reduce((s, r) => s + Number(r.valor), 0);
  const totalEstornado = regs.filter((r) => r.status_pagamento === "estornado").reduce((s, r) => s + Number(r.valor), 0);
  const repasseLiquido = totalPago;

  type CatSummary = { nome: string; genero: string; count: number; total: number };
  const catMap: Record<string, CatSummary> = {};
  for (const r of regs) {
    if (!r.championship_categories) continue;
    const catId = r.category_id;
    if (!catMap[catId]) catMap[catId] = { nome: r.championship_categories.nome, genero: r.championship_categories.genero, count: 0, total: 0 };
    if (r.status_pagamento === "pago") { catMap[catId].count += 1; catMap[catId].total += Number(r.valor); }
  }
  const catSummaries = Object.values(catMap).filter((c) => c.count > 0);

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
      bg:    "bg-emerald-50",
      ring:  "ring-emerald-200",
      text:  "text-emerald-700",
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
          <div className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/30">Valores pendentes e estornados não são contabilizados no total recebido nem no saldo líquido.</p>
          </div>
          <ChavePixClient chavePix={chavePix} />
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">
          <FinanceiroConteudoClient
            champId={id}
            repasseLiquido={repasseLiquido}
            totalPago={totalPago}
            statusCards={STATUS_CARDS}
            totalPix={totalPix}
            totalCredito={totalCredito}
            totalDebito={totalDebito}
            categorias={categorias}
            catMap={catMap}
            catSummaries={catSummaries}
          />
          <PlanoTaxas champId={id} isElite={isElite} status={camp.status} feePendente={feePendente} />
        </div>
      </div>
    </div>
  );
}
