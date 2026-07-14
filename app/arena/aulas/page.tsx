import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnerArenaHandle } from "@/lib/arena-handle";

// Rota legada — aulas agora vivem em /arena/[handle]/aulas.
export default async function LegacyAulasRedirect({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolved = await resolveOwnerArenaHandle(supabase, user.id, handle);
  if (!resolved) redirect("/perfil/ativar-arena");
  redirect(`/arena/${resolved}/aulas`);
}
