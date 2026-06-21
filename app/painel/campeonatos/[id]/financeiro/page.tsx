import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Info,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { getPlatformConfig } from "@/lib/platform-config";
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

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  // Chave Pix do organizador + se o campeonato é Elite + taxas da plataforma
  const [{ data: orgAccount }, { data: champExtra }, config] = await Promise.all([
    supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("championships")
      .select("is_elite, premium_fee_pendente")
      .eq("id", id)
      .maybeSingle(),
    getPlatformConfig(),
  ]);

  const chavePix    = orgAccount?.chave_pix ?? null;
  const isElite     = !!champExtra?.is_elite;
  const feePendente = Number(champExtra?.premium_fee_pendente ?? 0);

  // Inscrições com categoria (sem dupla — só para os totais financeiros)
  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`
      id, valor, status_pagamento, billing_type, category_id,
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id);

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  // Totais financeiros
  const totalPago      = regs.filter((r) => r.status_pagamento === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente  = regs.filter((r) => r.status_pagamento === "pendente").reduce((s, r) => s + Number(r.valor), 0);
  const totalEstornado = regs.filter((r) => r.status_pagamento === "estornado").reduce((s, r) => s + Number(r.valor), 0);
  const taxaPercent    = camp.taxaPlataforma ?? 0;
  const taxaTotal      = totalPago * (taxaPercent / 100);
  const repasseLiquido = totalPago - taxaTotal;

  // Breakdown por categoria (só inscrições pagas)
  type CatSummary = { nome: string; genero: string; count: number; total: number };
  const catMap: Record<string, CatSummary> = {};
  for (const r of regs) {
    if (!r.championship_categories) continue;
    const catId = r.category_id;
    if (!catMap[catId]) {
      catMap[catId] = {
        nome:  r.championship_categories.nome,
        genero: r.championship_categories.genero,
        count: 0,
        total: 0,
      };
    }
    if (r.status_pagamento === "pago") {
      catMap[catId].count += 1;
      catMap[catId].total += Number(r.valor);
    }
  }
  const catSummaries = Object.values(catMap).filter((c) => c.count > 0);

  const pagas = regs.filter((r) => r.status_pagamento === "pago");
  const totalPix    = pagas.filter((r) => r.billing_type === "PIX").reduce((s, r) => s + Number(r.valor), 0);
  const totalCredito = pagas.filter((r) => r.billing_type === "CREDIT_CARD").reduce((s, r) => s + Number(r.valor), 0);
  const totalDebito  = pagas.filter((r) => r.billing_type === "DEBIT_CARD").reduce((s, r) => s + Number(r.valor), 0);

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <TrendingUp className="size-4" />
                <p className="text-xs">Saldo Bruto</p>
              </div>
              <p className="mt-1 text-xl font-bold text-white">{formatBRL(totalPago)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/20 p-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <DollarSign className="size-4" />
                <p className="text-xs">Seu saldo líquido</p>
              </div>
              <p className="mt-1 text-xl font-bold text-emerald-300">{formatBRL(repasseLiquido)}</p>
            </div>
          </div>

          {/* Aviso discreto */}
          <div className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/30">
              Valores pendentes e estornados não são contabilizados no total recebido nem no saldo líquido.
            </p>
          </div>

          {/* Chave Pix */}
          <ChavePixClient chavePix={chavePix} />
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">

          {/* Status dos pagamentos */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Status dos pagamentos
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <StatusCard
                label="Pagos"
                count={regs.filter((r) => r.status_pagamento === "pago").length}
                valor={totalPago}
                bgColor="bg-emerald-50"
                borderColor="ring-emerald-200"
                textColor="text-emerald-700"
              />
              <StatusCard
                label="Pendentes"
                count={regs.filter((r) => r.status_pagamento === "pendente").length}
                valor={totalPendente}
                bgColor="bg-amber-50"
                borderColor="ring-amber-200"
                textColor="text-amber-700"
              />
              <StatusCard
                label="Estornados"
                count={regs.filter((r) => r.status_pagamento === "estornado").length}
                valor={totalEstornado}
                bgColor="bg-red-50"
                borderColor="ring-red-200"
                textColor="text-red-600"
              />
            </div>

            {/* Método de pagamento */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetodoCard emoji="⚡" label="Pix"     valor={totalPix} />
              <MetodoCard emoji="💳" label="Crédito" valor={totalCredito} />
              <MetodoCard emoji="🏦" label="Débito"  valor={totalDebito} />
            </div>
          </section>

          {/* Plano de taxas (Padrão x Elite) */}
          <PlanoTaxas
            champId={id}
            isElite={isElite}
            status={camp.status}
            feePendente={feePendente}
            padrao={{
              pixFixo:        config.plataformaPixFixo,
              debitoPercent:  config.plataformaDebitoPercent,
              debitoFixo:     config.plataformaDebitoFixo,
              creditoPercent: config.plataformaCreditoPercent,
              creditoFixo:    config.plataformaCreditoFixo,
            }}
            elite={{
              pixFixo:        config.premiumPixFixo,
              debitoPercent:  config.premiumDebitoPercent,
              debitoFixo:     config.premiumDebitoFixo,
              creditoPercent: config.premiumCreditoPercent,
              creditoFixo:    config.premiumCreditoFixo,
            }}
          />

          {/* Por categoria */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Por categoria
            </h2>
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
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                        Nenhuma categoria cadastrada
                      </td>
                    </tr>
                  ) : camp.categorias.map((cat) => {
                    const summary = catMap[cat.id];
                    const count   = summary?.count ?? 0;
                    const total   = summary?.total ?? 0;
                    const repasse = total - total * (taxaPercent / 100);
                    return (
                      <tr key={cat.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cat.nome}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {generoLabel(cat.genero as "masculino" | "feminino" | "mista")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5 text-gray-400" />
                            {count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatBRL(total)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {formatBRL(repasse)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {camp.categorias.length > 1 && (
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {catSummaries.reduce((s, c) => s + c.count, 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatBRL(totalPago)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">
                        {formatBRL(repasseLiquido)}
                      </td>
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

function StatusCard({
  label, count, valor, bgColor, borderColor, textColor,
}: {
  label: string;
  count: number;
  valor: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${bgColor} ${borderColor}`}>
      <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      <p className={`mt-2 text-2xl font-bold ${textColor}`}>{count}</p>
      <p className={`text-xs ${textColor} opacity-70`}>{formatBRL(valor)}</p>
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
      <p className={`text-sm font-semibold ${valor > 0 ? "text-gray-900" : "text-gray-300"}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}
