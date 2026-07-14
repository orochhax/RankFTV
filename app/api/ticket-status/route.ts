import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };

// Checa status de pagamento de um ingresso para o polling client-side.
// Visitante sem conta le via admin, mas precisa provar posse do link privado:
// id do ticket + access token.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const tipo = searchParams.get("tipo"); // "plateia" | "atleta"
  const token = normalizarTicketAccessToken(searchParams.get("token"));

  if (!id || !token || (tipo !== "plateia" && tipo !== "atleta")) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const table = tipo === "plateia" ? "spectator_tickets" : "athlete_tickets";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("status_pagamento, checked_in")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Ingresso nao encontrado." }, { status: 404, headers: PRIVATE_HEADERS });
  }

  return NextResponse.json(data, { headers: PRIVATE_HEADERS });
}
