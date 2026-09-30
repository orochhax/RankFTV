import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";
import { z } from "zod";
import { expireAthleteCheckoutIfNeeded } from "@/lib/athlete-checkout-expiration";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };
const ticketStatusBodySchema = z.object({
  id: z.uuid(),
  tipo: z.enum(["plateia", "atleta"]),
  token: z.uuid(),
}).strict();

// Checa status de pagamento de um ingresso para o polling client-side.
// Visitante sem conta le via admin, mas precisa provar posse do link privado:
// id do ticket + access token.
export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`ticket-status:${getClientIp(req.headers)}`, 120, 60))) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um minuto." }, { status: 429, headers: PRIVATE_HEADERS });
  }
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = ticketStatusBodySchema.safeParse({
    id: body?.id,
    tipo: body?.tipo,
    token: normalizarTicketAccessToken(typeof body?.token === "string" ? body.token : null),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { id, tipo, token } = parsed.data;

  const table = tipo === "plateia" ? "spectator_tickets" : "athlete_tickets";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select(tipo === "atleta"
      ? "status_pagamento, checked_in, checkout_expires_at"
      : "status_pagamento, checked_in")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Ingresso nao encontrado." }, { status: 404, headers: PRIVATE_HEADERS });
  }
  const ticketData = data as unknown as {
    status_pagamento: string;
    checked_in: boolean;
    checkout_expires_at?: string | null;
  };

  let reconciliationPending = false;
  if (
    tipo === "atleta"
    && ticketData.status_pagamento === "pendente"
    && ticketData.checkout_expires_at
    && Date.parse(ticketData.checkout_expires_at) <= Date.now()
  ) {
    const expiration = await expireAthleteCheckoutIfNeeded(id);
    ticketData.status_pagamento = expiration.status;
    reconciliationPending = expiration.reconciliationPending === true;
  }

  if (tipo === "atleta") {
    const credentialResult = await supabase
      .from("athlete_ticket_credentials")
      .select("id, athlete_slot, checked_in, checkin_at")
      .eq("athlete_ticket_id", id)
      .eq("athlete_slot", 1);
    return NextResponse.json(
      {
        ...ticketData,
        reconciliationPending,
        credentials: credentialResult.error ? [] : credentialResult.data ?? [],
      },
      { headers: PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(ticketData, { headers: PRIVATE_HEADERS });
}
