import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCsv } from "@/lib/csv";
import { roundCurrency } from "@/lib/championship-expenses";
import {
  isYmdWithinRange,
  REPORT_FIELD_DEFINITIONS,
  sanitizeReportFields,
  sanitizeReportSections,
  toSaoPauloYmd,
  type ReportRow,
} from "@/lib/financial-cockpit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: championship } = await supabase
    .from("championships")
    .select("id, nome, slug, organizador_id")
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle();

  if (!championship || championship.organizador_id !== user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const sections = sanitizeReportSections(url.searchParams.get("sections"));
  const fields = sanitizeReportFields(url.searchParams.get("fields"));

  const champId = championship.id;
  const admin = createAdminClient();

  const [
    catRes,
    regRes,
    ticketRes,
    specRes,
    expRes,
    payoutRes,
  ] = await Promise.all([
    admin.from("championship_categories").select("id, nome, genero").eq("championship_id", champId),
    sections.includes("inscricoes")
      ? admin
          .from("registrations")
          .select("category_id, status_pagamento, valor, billing_type, created_at")
          .eq("championship_id", champId)
          .order("created_at", { ascending: false })
          .limit(10000)
      : Promise.resolve({ data: [] }),
    sections.includes("inscricoes")
      ? admin
          .from("athlete_tickets")
          .select("category_id, comprador_nome, status_pagamento, valor, billing_type, created_at")
          .eq("championship_id", champId)
          .order("created_at", { ascending: false })
          .limit(10000)
      : Promise.resolve({ data: [] }),
    sections.includes("plateia")
      ? admin
          .from("spectator_tickets")
          .select("comprador_nome, tipo_nome, quantidade, status_pagamento, valor, billing_type, created_at")
          .eq("championship_id", champId)
          .order("created_at", { ascending: false })
          .limit(10000)
      : Promise.resolve({ data: [] }),
    sections.includes("despesas")
      ? admin
          .from("championship_expenses")
          .select("nome, categoria, valor, status, data_vencimento, data_pagamento")
          .eq("championship_id", champId)
          .order("data_vencimento", { ascending: true })
          .limit(5000)
      : Promise.resolve({ data: [] }),
    sections.includes("repasses")
      ? admin
          .from("financial_operations")
          .select("status, amount, provider_status, created_at, completed_at")
          .eq("flow", "payout")
          .eq("operation_type", "transfer")
          .eq("metadata->>championshipId", champId)
          .order("created_at", { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: [] }),
  ]);

  const catMap = new Map(
    (catRes.data ?? []).map((c) => [c.id, `${c.nome}${c.genero ? ` (${c.genero})` : ""}`]),
  );

  const rows: ReportRow[] = [];

  for (const r of regRes.data ?? []) {
    const ymd = toSaoPauloYmd(r.created_at);
    if (!isYmdWithinRange(ymd, startDate, endDate)) continue;
    rows.push({
      secao: "inscricoes",
      secaoLabel: "Inscrições",
      origem: "Inscrição via conta",
      categoria: catMap.get(r.category_id) ?? "Categoria",
      status: String(r.status_pagamento ?? ""),
      formaPagamento: String(r.billing_type ?? "—"),
      valorBruto: roundCurrency(Number(r.valor ?? 0)),
      data: ymd,
    });
  }

  for (const t of ticketRes.data ?? []) {
    const ymd = toSaoPauloYmd(t.created_at);
    if (!isYmdWithinRange(ymd, startDate, endDate)) continue;
    rows.push({
      secao: "inscricoes",
      secaoLabel: "Inscrições",
      origem: t.comprador_nome || "Inscrição convidado",
      categoria: catMap.get(t.category_id) ?? "Categoria",
      status: String(t.status_pagamento ?? ""),
      formaPagamento: String(t.billing_type ?? "—"),
      valorBruto: roundCurrency(Number(t.valor ?? 0)),
      data: ymd,
    });
  }

  for (const s of specRes.data ?? []) {
    const ymd = toSaoPauloYmd(s.created_at);
    if (!isYmdWithinRange(ymd, startDate, endDate)) continue;
    const qtd = Number(s.quantidade || 1);
    rows.push({
      secao: "plateia",
      secaoLabel: "Plateia",
      origem: s.comprador_nome || "Comprador de plateia",
      categoria: `${s.tipo_nome ?? "Ingresso"}${qtd > 1 ? ` (${qtd}x)` : ""}`,
      status: String(s.status_pagamento ?? ""),
      formaPagamento: String(s.billing_type ?? "—"),
      valorBruto: roundCurrency(Number(s.valor ?? 0)),
      data: ymd,
    });
  }

  for (const e of expRes.data ?? []) {
    const refDate = toSaoPauloYmd(e.data_pagamento ?? e.data_vencimento);
    if (!isYmdWithinRange(refDate, startDate, endDate)) continue;
    rows.push({
      secao: "despesas",
      secaoLabel: "Despesas",
      origem: e.nome,
      categoria: e.categoria,
      status: e.status === "pago" ? "Paga" : "A vencer",
      formaPagamento: `Venc. ${e.data_vencimento}`,
      valorBruto: -roundCurrency(Number(e.valor ?? 0)),
      data: refDate,
    });
  }

  for (const p of payoutRes.data ?? []) {
    const ymd = toSaoPauloYmd(p.completed_at ?? p.created_at);
    if (!isYmdWithinRange(ymd, startDate, endDate)) continue;
    rows.push({
      secao: "repasses",
      secaoLabel: "Repasses / Saques",
      origem: "Transferência Pix",
      categoria: "Saque do organizador",
      status: String(p.provider_status ?? p.status ?? ""),
      formaPagamento: "PIX",
      valorBruto: roundCurrency(Number(p.amount ?? 0)),
      data: ymd,
    });
  }

  rows.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  if (format === "json") {
    return NextResponse.json({
      championshipName: championship.nome,
      fields,
      rows,
    });
  }

  const headers = fields.map((f) => REPORT_FIELD_DEFINITIONS[f].label);
  const csvRows = rows.map((row) =>
    fields.map((f) => {
      if (f === "secao") return row.secaoLabel;
      return row[f];
    }),
  );

  const csv = makeCsv(headers, csvRows);
  const slug = championship.slug ?? champId.slice(0, 8);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rankftv-personalizado-${slug}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
