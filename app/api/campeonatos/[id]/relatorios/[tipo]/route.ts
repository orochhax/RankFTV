import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCsv } from "@/lib/csv";

const TYPES = new Set(["vendas", "presenca", "categorias", "repasses"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  if (!TYPES.has(tipo)) return NextResponse.json({ error: "Relatório inválido." }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: championship } = await supabase.from("championships").select("organizador_id").eq("id", id).maybeSingle();
  if (!championship || championship.organizador_id !== user.id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const admin = createAdminClient();
  let csv = "";
  if (tipo === "vendas") {
    const [{ data: registrations }, { data: tickets }] = await Promise.all([
      admin.from("registrations").select("status_pagamento, valor, billing_type, created_at").eq("championship_id", id).limit(10000),
      admin.from("athlete_tickets").select("status_pagamento, valor, billing_type, created_at").eq("championship_id", id).limit(10000),
    ]);
    csv = makeCsv(["Origem", "Status", "Valor", "Forma", "Data"], [...(registrations ?? []).map((row) => ["Conta", row.status_pagamento, Number(row.valor), row.billing_type, row.created_at]), ...(tickets ?? []).map((row) => ["Convidado", row.status_pagamento, Number(row.valor), row.billing_type, row.created_at])]);
  } else if (tipo === "presenca") {
    const [{ data: credentials }, { data: guestCredentials }] = await Promise.all([
      admin.from("credentials").select("checked_in, checkin_at").eq("championship_id", id).limit(10000),
      admin.from("athlete_ticket_credentials").select("checked_in, checkin_at").eq("championship_id", id).limit(10000),
    ]);
    const all = [...(credentials ?? []), ...(guestCredentials ?? [])];
    csv = makeCsv(["Situação", "Quantidade"], [["Presente", all.filter((row) => row.checked_in).length], ["Pendente", all.filter((row) => !row.checked_in).length], ["Total", all.length]]);
  } else if (tipo === "categorias") {
    const [{ data: categories }, { data: registrations }, { data: tickets }] = await Promise.all([
      admin.from("championship_categories").select("id, nome, genero").eq("championship_id", id),
      admin.from("registrations").select("category_id, status_pagamento, valor").eq("championship_id", id).limit(10000),
      admin.from("athlete_tickets").select("category_id, status_pagamento, valor").eq("championship_id", id).limit(10000),
    ]);
    const sales = [...(registrations ?? []), ...(tickets ?? [])].filter((row) => row.status_pagamento === "pago");
    csv = makeCsv(["Categoria", "Gênero", "Inscrições pagas", "Valor pago"], (categories ?? []).map((category) => { const items = sales.filter((sale) => sale.category_id === category.id); return [category.nome, category.genero, items.length, items.reduce((sum, item) => sum + Number(item.valor), 0)]; }));
  } else {
    const { data: payouts } = await admin.from("financial_operations").select("status, amount, provider_status, created_at, completed_at").eq("flow", "payout").eq("operation_type", "transfer").eq("metadata->>championshipId", id).order("created_at", { ascending: false }).limit(10000);
    csv = makeCsv(["Status", "Valor", "Status processador", "Criado em", "Concluído em"], (payouts ?? []).map((row) => [row.status, Number(row.amount ?? 0), row.provider_status, row.created_at, row.completed_at]));
  }
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rankftv-${tipo}-${id.slice(0, 8)}.csv"`, "cache-control": "private, no-store" } });
}
