import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { compararHashOtp } from "@/lib/otp";

const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "no-store, private" };
const MAX_TENTATIVAS = 5;
const ERRO_GENERICO = "Código inválido ou expirado.";

// Passo 2: troca o código de 6 dígitos (mandado por e-mail no passo 1,
// POST /api/meus-ingressos) pela lista de ingressos. Nunca devolve qual foi
// o motivo exato de falha (expirado/errado/já usado/tentativas esgotadas) —
// sempre a mesma mensagem genérica, pra não virar oráculo de força bruta.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowedIp = await checkRateLimit(`ingressos-verif:ip:${ip}`, 20, 60);
  if (!allowedIp) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429, headers: PRIVATE_RESPONSE_HEADERS });
  }

  let body: { cpf?: unknown; email?: unknown; codigo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const cpf = (typeof body.cpf === "string" ? body.cpf : "").replace(/\D/g, "");
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  const codigo = (typeof body.codigo === "string" ? body.codigo : "").trim();

  if (cpf.length !== 11 || !email.includes("@") || !/^\d{6}$/.test(codigo)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const allowedPar = await checkRateLimit(`ingressos-verif:par:${cpf}:${email}`, MAX_TENTATIVAS, 600);
  if (!allowedPar) {
    return NextResponse.json({ error: ERRO_GENERICO }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const supabase = createAdminClient();

  const { data: pendente } = await supabase
    .from("ticket_recovery_codes")
    .select("id, codigo_hash, tentativas, usado_em, expira_em")
    .eq("cpf", cpf)
    .eq("email", email)
    .is("usado_em", null)
    .gt("expira_em", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendente || pendente.tentativas >= MAX_TENTATIVAS) {
    return NextResponse.json({ error: ERRO_GENERICO }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  if (!compararHashOtp(codigo, pendente.codigo_hash)) {
    await supabase.from("ticket_recovery_codes").update({ tentativas: pendente.tentativas + 1 }).eq("id", pendente.id);
    return NextResponse.json({ error: ERRO_GENERICO }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  // Código de uso único — marca usado antes de devolver qualquer dado.
  await supabase.from("ticket_recovery_codes").update({ usado_em: new Date().toISOString() }).eq("id", pendente.id);

  const [ath1, ath2, plateia] = await Promise.all([
    supabase
      .from("athlete_tickets")
      .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
      .eq("comprador_cpf", cpf)
      .eq("comprador_email", email)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("athlete_tickets")
      .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
      .eq("parceiro_cpf", cpf)
      .eq("parceiro_email", email)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("spectator_tickets")
      .select("id, championship_id, tipo_nome, comprador_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
      .eq("comprador_cpf", cpf)
      .eq("comprador_email", email)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type Row = { id: string; championship_id: string; championships: unknown; [k: string]: unknown };
  function champNome(row: Row): string {
    const c = row.championships as { nome?: string } | null;
    return c?.nome ?? "Campeonato";
  }

  const atleta = [
    ...(ath1.data ?? []).map((r) => ({
      tipo: "atleta" as const,
      ticket_id: r.id,
      championship_id: r.championship_id,
      campeonato_nome: champNome(r as Row),
      categoria_nome: r.categoria_nome ?? null,
      tipo_nome: null,
      comprador_nome: r.comprador_nome,
      parceiro_nome: r.parceiro_nome ?? null,
      valor: Number(r.valor),
      status_pagamento: r.status_pagamento,
      code: r.code ?? null,
      access_token: r.access_token ?? null,
      checked_in: r.checked_in,
    })),
    ...(ath2.data ?? []).map((r) => ({
      tipo: "atleta" as const,
      ticket_id: r.id,
      championship_id: r.championship_id,
      campeonato_nome: champNome(r as Row),
      categoria_nome: r.categoria_nome ?? null,
      tipo_nome: null,
      comprador_nome: r.comprador_nome,
      parceiro_nome: r.parceiro_nome ?? null,
      valor: Number(r.valor),
      status_pagamento: r.status_pagamento,
      code: r.code ?? null,
      access_token: r.access_token ?? null,
      checked_in: r.checked_in,
    })),
  ];

  const plateiaList = (plateia.data ?? []).map((r) => ({
    tipo: "plateia" as const,
    ticket_id: r.id,
    championship_id: r.championship_id,
    campeonato_nome: champNome(r as Row),
    categoria_nome: null,
    tipo_nome: r.tipo_nome ?? null,
    comprador_nome: r.comprador_nome,
    parceiro_nome: null,
    valor: Number(r.valor),
    status_pagamento: r.status_pagamento,
    code: r.code ?? null,
    access_token: r.access_token ?? null,
    checked_in: r.checked_in,
  }));

  const seen = new Set<string>();
  const ingressos = [...atleta, ...plateiaList].filter((i) => {
    const key = `${i.tipo}-${i.ticket_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ ingressos }, { headers: PRIVATE_RESPONSE_HEADERS });
}
