import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readAthleteCredentialSession } from "@/lib/athlete-credential-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };
const credentialStatusSchema = z.object({ id: z.uuid() }).strict();

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`athlete-credential-status:${getClientIp(req.headers)}`, 120, 60))) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um minuto." }, { status: 429, headers: PRIVATE_HEADERS });
  }
  const parsed = credentialStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const credentialId = parsed.data.id;
  const accessToken = await readAthleteCredentialSession(credentialId);
  if (!accessToken) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 404, headers: PRIVATE_HEADERS });
  }

  const admin = createAdminClient();
  const { data: credential, error } = await admin
    .from("athlete_ticket_credentials")
    .select("athlete_ticket_id, checked_in, checkin_at")
    .eq("id", credentialId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (error || !credential) {
    return NextResponse.json({ error: "Credencial não encontrada." }, { status: 404, headers: PRIVATE_HEADERS });
  }

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("status_pagamento")
    .eq("id", credential.athlete_ticket_id)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ingresso não encontrado." }, { status: 404, headers: PRIVATE_HEADERS });
  }

  return NextResponse.json({
    status_pagamento: ticket.status_pagamento,
    checked_in: credential.checked_in,
    checkin_at: credential.checkin_at,
  }, { headers: PRIVATE_HEADERS });
}
