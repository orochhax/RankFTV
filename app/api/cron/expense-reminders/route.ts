import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/format";
import { resolveBaseUrl } from "@/lib/site-url";
import { enviarLembreteDespesa } from "@/lib/email/send";
import { daysUntilDue, getSaoPauloDateString } from "@/lib/championship-expenses";

export const dynamic = "force-dynamic";

const BASE_URL = resolveBaseUrl(process.env.NEXT_PUBLIC_BASE_URL, "https://www.rankftv.com");

async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = getSaoPauloDateString();

  // Calcula a data limite de 3 dias no futuro
  const [y, m, d] = todayStr.split("-").map(Number);
  const future = new Date(y, m - 1, d + 3);
  const limitDateStr = getSaoPauloDateString(future);

  // Busca despesas pendentes que vencem de hoje até daqui a 3 dias
  const { data: expenses, error } = await supabase
    .from("championship_expenses")
    .select(`
      id, nome, categoria, valor, data_vencimento,
      championships!inner (
        id, nome, slug, organizador_id
      )
    `)
    .eq("status", "pendente")
    .gte("data_vencimento", todayStr)
    .lte("data_vencimento", limitDateStr)
    .limit(100);

  if (error || !expenses) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Falha ao buscar despesas" });
  }

  let sentCount = 0;

  for (const exp of expenses) {
    const champ = exp.championships as unknown as {
      id: string;
      nome: string;
      slug: string | null;
      organizador_id: string;
    };

    if (!champ?.organizador_id) continue;

    // Busca o perfil do organizador
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", champ.organizador_id)
      .maybeSingle();

    if (!profile?.email) continue;

    const diasRestantes = daysUntilDue(exp.data_vencimento);
    const champSlugOrId = champ.slug ?? champ.id;
    const painelUrl = `${BASE_URL}/painel/campeonatos/${champSlugOrId}/despesas`;

    const idempotencyKey = `expense-reminder-${exp.id}-${todayStr}`;

    const sent = await enviarLembreteDespesa({
      email: profile.email,
      nomeOrganizador: profile.nome || "Organizador",
      nomeCampeonato: champ.nome,
      nomeDespesa: exp.nome,
      categoria: exp.categoria,
      valorFormatado: formatBRL(Number(exp.valor)),
      dataVencimentoFormatada: formatDateBR(exp.data_vencimento),
      diasRestantes,
      painelUrl,
      idempotencyKey,
    });

    if (sent) sentCount++;
  }

  return NextResponse.json({ ok: true, found: expenses.length, sent: sentCount });
}

export const GET = run;
export const POST = run;
