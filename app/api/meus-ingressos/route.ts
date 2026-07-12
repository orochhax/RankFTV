import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Consulta publica de ingressos por CPF + e-mail.
// Usa service_role porque visitante nao tem conta, mas filtra por CPF+email e
// nao devolve qr_token. O QR completo so aparece na pagina privada com token.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(`ingressos:${ip}`, 15, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde um minuto e tente de novo." },
      { status: 429 },
    );
  }

  const { searchParams } = req.nextUrl;
  const cpf = (searchParams.get("cpf") ?? "").replace(/\D/g, "");
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (cpf.length !== 11 || !email.includes("@")) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [ath1, ath2, plateia] = await Promise.all([
    supabase
      .from("athlete_tickets")
      .select(
        "id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
      )
      .eq("comprador_cpf", cpf)
      .eq("comprador_email", email)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("athlete_tickets")
      .select(
        "id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
      )
      .eq("parceiro_cpf", cpf)
      .eq("parceiro_email", email)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("spectator_tickets")
      .select(
        "id, championship_id, tipo_nome, comprador_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
      )
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

  return NextResponse.json({ ingressos });
}
