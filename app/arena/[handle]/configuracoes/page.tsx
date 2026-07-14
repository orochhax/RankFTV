import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditArenaForm } from "@/components/arena/EditArenaForm";

export default async function ConfiguracoesArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/configuracoes`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, descricao, cidade, estado, avatar_url")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: photos } = await supabase
    .from("arena_photos")
    .select("id, url")
    .eq("arena_id", arena.id)
    .order("ordem", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400">Fotos, nome, descrição e localização.</p>
      </div>
      <EditArenaForm
        arenaId={arena.id}
        handle={arena.handle}
        initialNome={arena.nome}
        initialDescricao={arena.descricao}
        initialCidade={arena.cidade}
        initialEstado={arena.estado}
        initialAvatarUrl={arena.avatar_url}
        initialPhotos={photos ?? []}
      />
    </div>
  );
}
