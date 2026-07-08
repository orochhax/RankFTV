import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Checa status de pagamento de um ingresso, pra polling client-side na tela
// de Pix (auto-atualiza sem o usuário precisar dar refresh). Usado por
// visitantes sem conta, então lê via admin — o id do ingresso já é a "chave"
// (UUID imprevisível), e a resposta não expõe dados sensíveis (sem nome,
// sem qr_token).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const tipo = searchParams.get("tipo"); // "plateia" | "atleta"

  if (!id || (tipo !== "plateia" && tipo !== "atleta")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const table = tipo === "plateia" ? "spectator_tickets" : "athlete_tickets";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("status_pagamento, checked_in")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Ingresso não encontrado." }, { status: 404 });
  }

  return NextResponse.json(data);
}
