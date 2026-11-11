import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/format";
import { resolveBaseUrl } from "@/lib/site-url";
import { enviarLembreteDespesa } from "@/lib/email/send";
import {
  addDaysSaoPauloDateString,
  daysUntilDue,
  getSaoPauloDateString,
} from "@/lib/championship-expenses";

export const dynamic = "force-dynamic";

const BASE_URL = resolveBaseUrl(process.env.NEXT_PUBLIC_BASE_URL, "https://www.rankftv.com");

type OrganizerContact = {
  email: string | null;
  nome: string;
};

async function resolveOrganizerContact(
  supabase: ReturnType<typeof createAdminClient>,
  organizerId: string,
  cache: Map<string, OrganizerContact>,
): Promise<OrganizerContact> {
  const cached = cache.get(organizerId);
  if (cached) return cached;

  const [authRes, profileRes] = await Promise.all([
    supabase.auth.admin.getUserById(organizerId),
    supabase.from("profiles").select("nome").eq("id", organizerId).maybeSingle(),
  ]);

  const contact: OrganizerContact = {
    email: authRes.data?.user?.email ?? null,
    nome: profileRes.data?.nome?.trim() || "Organizador",
  };
  cache.set(organizerId, contact);
  return contact;
}

async function run(request: NextRequest) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = getSaoPauloDateString();
  const limitDateStr = addDaysSaoPauloDateString(todayStr, 3);

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
    .order("data_vencimento", { ascending: true })
    .limit(100);

  if (error || !expenses) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Falha ao buscar despesas" });
  }

  let sentCount = 0;
  const contactCache = new Map<string, OrganizerContact>();

  for (const exp of expenses) {
    const champ = exp.championships as unknown as {
      id: string;
      nome: string;
      slug: string | null;
      organizador_id: string;
    };

    if (!champ?.organizador_id) continue;

    const contact = await resolveOrganizerContact(supabase, champ.organizador_id, contactCache);
    if (!contact.email) continue;

    const diasRestantes = daysUntilDue(exp.data_vencimento);
    const champSlugOrId = champ.slug ?? champ.id;
    const painelUrl = `${BASE_URL}/painel/campeonatos/${champSlugOrId}/despesas`;
    const idempotencyKey = `expense-reminder-${exp.id}-${todayStr}`;

    const sent = await enviarLembreteDespesa({
      email: contact.email,
      nomeOrganizador: contact.nome,
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
