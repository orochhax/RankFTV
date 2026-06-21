import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Exige login: busca de usuários é só para convidar parceiro/staff.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

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
