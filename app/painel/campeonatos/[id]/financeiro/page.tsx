import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info, Users, ChevronRight } from "lucide-react";
import { FinanceiroHeaderClient } from "@/components/painel/FinanceiroHeaderClient";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { formatBRL, generoLabel } from "@/lib/format";
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
      slug:    "pagos",
      label:   "Pagos",
      count:   regs.filter((r) => r.status_pagamento === "pago").length,
      valor:   totalPago,
      bg:      "bg-emerald-50",
      ring:    "ring-emerald-200",
      text:    "text-emerald-700",
    },
    {
      slug:    "pendentes",
      label:   "Pendentes",
      count:   regs.filter((r) => r.status_pagamento === "pendente").length,
      valor:   totalPendente,
      bg:      "bg-amber-50",
      ring:    "ring-amber-200",
      text:    "text-amber-700",
    },
    {
      slug:    "estornados",
      label:   "Estornados",
      count:   regs.filter((r) => r.status_pagamento === "estornado").length,
      valor:   totalEstornado,
      bg:      "bg-red-50",
      ring:    "ring-red-200",
      text:    "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href={`/painel/campeonatos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          <FinanceiroHeaderClient repasseLiquido={repasseLiquido} />
          <div className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/30">Valores pendentes e estornados não são contabilizados no total recebido nem no saldo líquido.</p>
          </div>
          <ChavePixClient chavePix={chavePix} />
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">

          {/* Status dos pagamentos */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status dos pagamentos</h2>
            <div className="grid grid-cols-3 gap-3">
              {STATUS_CARDS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/painel/campeonatos/${id}/financeiro/${c.slug}`}
                  className={`group relative rounded-2xl p-4 ring-1 transition-all hover:shadow-md hover:scale-[1.02] ${c.bg} ${c.ring}`}
                >
                  <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${c.text}`}>{c.count}</p>
                  <p className={`text-xs ${c.text} opacity-70`}>{formatBRL(c.valor)}</p>
                  <ChevronRight className={`absolute bottom-3 right-3 size-3.5 opacity-0 group-hover:opacity-60 transition-opacity ${c.text}`} />
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetodoCard emoji="⚡" label="Pix"     valor={totalPix} />
              <MetodoCard emoji="💳" label="Crédito" valor={totalCredito} />
              <MetodoCard emoji="🏦" label="Débito"  valor={totalDebito} />
            </div>
          </section>

          {/* Plano de taxas */}
          <PlanoTaxas champId={id} isElite={isElite} status={camp.status} feePendente={feePendente} />

          {/* Gráfico: arrecadação por categoria */}
          {camp.categorias.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Arrecadação por categoria</h2>
              <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-4">
                <CategoriaBarChart categorias={camp.categorias} catMap={catMap} />
              </div>
            </section>
          )}

          {/* Por categoria */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Por categoria</h2>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Inscrições</th>
                    <th className="px-4 py-3 text-right">Total bruto</th>
                    <th className="px-4 py-3 text-right">Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {camp.categorias.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma categoria cadastrada</td></tr>
                  ) : camp.categorias.map((cat) => {
                    const summary = catMap[cat.id];
                    const count = summary?.count ?? 0;
                    const total = summary?.total ?? 0;
                    return (
                      <tr key={cat.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cat.nome}</p>
                          <p className="text-xs text-gray-400 capitalize">{generoLabel(cat.genero as "masculino" | "feminino" | "mista")}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600"><span className="inline-flex items-center gap-1"><Users className="size-3.5 text-gray-400" />{count}</span></td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatBRL(total)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatBRL(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {camp.categorias.length > 1 && (
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{catSummaries.reduce((s, c) => s + c.count, 0)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatBRL(totalPago)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{formatBRL(repasseLiquido)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

type CatBarProps = {
  categorias: { id: string; nome: string; genero: string; valorInscricao: number | null }[];
  catMap: Record<string, { nome: string; genero: string; count: number; total: number }>;
};

function CategoriaBarChart({ categorias, catMap }: CatBarProps) {
  const maxTotal = Math.max(...categorias.map((c) => catMap[c.id]?.total ?? 0), 1);
  return (
    <div className="space-y-4">
      {categorias.map((cat) => {
        const total = catMap[cat.id]?.total ?? 0;
        const count = catMap[cat.id]?.count ?? 0;
        const pct = (total / maxTotal) * 100;
        return (
          <div key={cat.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-800">{cat.nome}</span>
              <span className={`font-semibold ${total > 0 ? "text-gray-900" : "text-gray-300"}`}>
                {formatBRL(total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs text-gray-400">
                {count} dupla{count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetodoCard({ emoji, label, valor }: { emoji: string; label: string; valor: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{emoji}</span>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-sm font-semibold ${valor > 0 ? "text-gray-900" : "text-gray-300"}`}>{formatBRL(valor)}</p>
    </div>
  );
}
