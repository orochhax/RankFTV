import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Exige login: busca de usuários é só para convidar parceiro/staff.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Rate limit por usuário pra evitar enumeração em massa de @usuários.
  // Máx. 40 buscas por conta a cada 60s (o input dispara conforme digita).
  const allowed = await checkRateLimit(`usersearch:${user.id}`, 40, 60);
  if (!allowed) return NextResponse.json([], { status: 429 });

  const q = req.nextUrl.searchParams.get("q")?.trim().replace(/^@/, "") ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, username")
    .ilike("username", `${q}%`)
    .limit(8);

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
