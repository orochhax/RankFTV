import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ArenaRel = { handle: string; dono_id: string };
function arenaDe(raw: unknown): ArenaRel | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ArenaRel) ?? null;
  return raw as ArenaRel;
}

// Rota legada — detalhe de aula agora vive em /arena/[handle]/aula/[classId].
export default async function LegacyAulaDetalheRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { classId } = await params;
  const { data: dataParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aula } = await supabase
    .from("arena_classes")
    .select("id, arenas(handle, dono_id)")
    .eq("id", classId)
    .maybeSingle();
  if (!aula) notFound();

  const arena = arenaDe(aula.arenas);
  if (!arena || arena.dono_id !== user.id) redirect("/arena");

  const qs = dataParam ? `?data=${dataParam}` : "";
  redirect(`/arena/${arena.handle}/aula/${classId}${qs}`);
}
