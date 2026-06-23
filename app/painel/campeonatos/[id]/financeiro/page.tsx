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
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { formatBRL, generoLabel } from "@/lib/format";
import { ChavePixClient } from "@/components/painel/ChavePixClient";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";
import { InscricaoExpandivel } from "@/components/painel/InscricaoExpandivel";

type RegRow = {
  id: string;
  valor: number;
  status_pagamento: "pago" | "pendente" | "estornado";
  billing_type: string | null;
  category_id: string;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

type Filtro = "pago" | "pendente" | "estornado";

export default async function FinanceiroPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { id }     = await params;
  const { filtro: filtroParam } = await searchParams;
  const filtro = (["pago", "pendente", "estornado"].includes(filtroParam ?? "")
    ? filtroParam
    : null) as Filtro | null;

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

  // ── Lista filtrada ────────────────────────────────────────────────────────
  type InscricaoDetalhe = {
    regId:      string;
    valor:      number;
    categoria:  string;
    criadoEm:   string;
    atleta1:    { nome: string; username: string; telefone: string | null; email: string | null };
    atleta2:    { nome: string; username: string; telefone: string | null; email: string | null } | null;
  };

  let listaFiltrada: InscricaoDetalhe[] = [];

  if (filtro) {
    const { data: rawFiltered } = await supabase
      .from("registrations")
      .select(`id, valor, created_at, team_id, championship_categories(nome), teams(atleta1_id, atleta2_id)`)
      .eq("championship_id", id)
      .eq("status_pagamento", filtro)
      .order("created_at", { ascending: false });

    if (rawFiltered && rawFiltered.length > 0) {
      // Coleta todos os IDs de atletas únicos
      const atletaIds = new Set<string>();
      for (const r of rawFiltered) {
        const t = (r.teams as unknown) as { atleta1_id: string; atleta2_id: string | null } | null;
        if (t?.atleta1_id) atletaIds.add(t.atleta1_id);
        if (t?.atleta2_id) atletaIds.add(t.atleta2_id);
      }
      const ids = Array.from(atletaIds);

      // Busca perfis (nome, username, telefone)
      const { data: perfis } = await supabase
        .from("profiles")
        .select("id, nome, username, telefone")
        .in("id", ids);
      const perfilMap: Record<string, { nome: string; username: string; telefone: string | null }> =
        Object.fromEntries((perfis ?? []).map((p) => [p.id, p]));

      // Busca e-mails via admin (auth.users)
      const admin = createAdminClient();
      const emailMap: Record<string, string | null> = {};
      await Promise.all(
        ids.map(async (uid) => {
          const { data } = await admin.auth.admin.getUserById(uid);
          emailMap[uid] = data?.user?.email ?? null;
        }),
      );

      listaFiltrada = rawFiltered.map((r) => {
        const t   = (r.teams as unknown) as { atleta1_id: string; atleta2_id: string | null } | null;
        const cat = (r.championship_categories as unknown) as { nome: string } | null;
        const a1id = t?.atleta1_id ?? "";
        const a2id = t?.atleta2_id ?? null;
        const p1 = perfilMap[a1id];
        const p2 = a2id ? perfilMap[a2id] : null;
        return {
          regId:     r.id,
          valor:     Number(r.valor),
          categoria: cat?.nome ?? "—",
          criadoEm:  r.created_at as string,
          atleta1:   { nome: p1?.nome ?? "—", username: p1?.username ?? "—", telefone: p1?.telefone ?? null, email: emailMap[a1id] ?? null },
          atleta2:   p2 ? { nome: p2.nome, username: p2.username, telefone: p2.telefone ?? null, email: emailMap[a2id!] ?? null } : null,
        };
      });
    }
  }

  const FILTRO_CONFIG = {
    pago:      { label: "Pagos",      bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", count: regs.filter((r) => r.status_pagamento === "pago").length,      valor: totalPago },
    pendente:  { label: "Pendentes",  bg: "bg-amber-50",   ring: "ring-amber-200",   text: "text-amber-700",   count: regs.filter((r) => r.status_pagamento === "pendente").length,  valor: totalPendente },
    estornado: { label: "Estornados", bg: "bg-red-50",     ring: "ring-red-200",     text: "text-red-600",     count: regs.filter((r) => r.status_pagamento === "estornado").length, valor: totalEstornado },
  };

  const TITULO_FILTRO: Record<Filtro, string> = {
    pago:      "Duplas que pagaram",
    pendente:  "Duplas com pagamento pendente",
    estornado: "Duplas estornadas / canceladas",
  };

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href={`/painel/campeonatos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50"><TrendingUp className="size-4" /><p className="text-xs">Saldo Bruto</p></div>
              <p className="mt-1 text-xl font-bold text-white">{formatBRL(totalPago)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/20 p-4">
              <div className="flex items-center gap-1.5 text-emerald-400"><DollarSign className="size-4" /><p className="text-xs">Seu saldo líquido</p></div>
              <p className="mt-1 text-xl font-bold text-emerald-300">{formatBRL(repasseLiquido)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/30">Valores pendentes e estornados não são contabilizados no total recebido nem no saldo líquido.</p>
          </div>
          <ChavePixClient chavePix={chavePix} />
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">

          {/* Status dos pagamentos — cards clicáveis */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status dos pagamentos</h2>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(FILTRO_CONFIG) as [Filtro, typeof FILTRO_CONFIG[Filtro]][]).map(([key, cfg]) => (
                <Link
                  key={key}
                  href={filtro === key ? `/painel/campeonatos/${id}/financeiro` : `/painel/campeonatos/${id}/financeiro?filtro=${key}`}
                  className={`rounded-2xl p-4 ring-1 transition-all ${cfg.bg} ${cfg.ring} ${filtro === key ? "ring-2 shadow-md scale-[1.02]" : "hover:shadow-sm hover:scale-[1.01]"}`}
                >
                  <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${cfg.text}`}>{cfg.count}</p>
                  <p className={`text-xs ${cfg.text} opacity-70`}>{formatBRL(cfg.valor)}</p>
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetodoCard emoji="⚡" label="Pix"     valor={totalPix} />
              <MetodoCard emoji="💳" label="Crédito" valor={totalCredito} />
              <MetodoCard emoji="🏦" label="Débito"  valor={totalDebito} />
            </div>
          </section>

          {/* Lista filtrada */}
          {filtro && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {TITULO_FILTRO[filtro]}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {listaFiltrada.length}
                </span>
              </h2>

              {listaFiltrada.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400 ring-1 ring-black/5">
                  Nenhuma inscrição com este status.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl ring-1 ring-black/5">
                  {listaFiltrada.map((ins) => (
                    <InscricaoExpandivel key={ins.regId} inscricao={ins} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Plano de taxas */}
          <PlanoTaxas champId={id} isElite={isElite} status={camp.status} feePendente={feePendente} />

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
