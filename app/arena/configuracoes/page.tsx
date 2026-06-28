import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditArenaForm } from "@/components/arena/EditArenaForm";

export default async function ConfiguracoesArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("arenas")
    .select("id, nome, handle, descricao, cidade, estado, avatar_url")
    .eq("dono_id", user.id);

  if (handle) query = query.eq("handle", handle);
  else query = query.order("created_at", { ascending: true });

  const { data: arena } = await query.maybeSingle();
  if (!arena) redirect("/perfil/ativar-arena");

  const { data: photos } = await supabase
    .from("arena_photos")
    .select("id, url")
    .eq("arena_id", arena.id)
    .order("ordem", { ascending: true });

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href={`/arena/${arena.handle}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Settings2 className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Editar arena</h1>
          </div>
          <p className="text-sm text-white/50">Fotos, nome, descrição e localização.</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
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
      </div>
    </div>
  );
}
