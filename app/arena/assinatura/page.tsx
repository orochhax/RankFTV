import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnerArenaHandle } from "@/lib/arena-handle";

// Rota legada — assinatura agora vive em /arena/[handle]/assinatura.
export default async function LegacyAssinaturaRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolved = await resolveOwnerArenaHandle(supabase, user.id);
  if (!resolved) redirect("/perfil/ativar-arena");
  redirect(`/arena/${resolved}/assinatura`);
}
