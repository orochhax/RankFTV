import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(request: NextRequest) {
  void request;
  return NextResponse.json({ error: "Agendamento de pesquisa do YouTube está desativado. Use a atualização manual pelo Codex." }, { status: 410 });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
