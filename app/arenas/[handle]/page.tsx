import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EntrarNaArenaButtons } from "@/components/arena/EntrarNaArenaButtons";

export default async function ArenaPublicaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, descricao, avatar_url, banner_url")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) notFound();

  const { count: alunosAtivos } = await supabase
    .from("arena_students")
    .select("id", { count: "exact", head: true })
    .eq("arena_id", arena.id)
    .eq("status", "ativo");

  // Se está logado, verifica se já é aluno
  let vinculo: { status: string } | null = null;
  if (user) {
    const { data: v } = await supabase
      .from("arena_students")
      .select("status")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .maybeSingle();
    vinculo = v;
  }

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href="/arenas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Arenas
          </Link>

          {/* Banner ou placeholder */}
          {arena.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={arena.banner_url}
              alt={arena.nome}
              className="h-28 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800">
              <Building2 className="size-10 text-white/60" />
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
              {arena.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={arena.avatar_url} alt={arena.nome} className="size-14 rounded-xl object-cover" />
              ) : (
                <Building2 className="size-7 text-white/60" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{arena.nome}</h1>
              <p className="flex items-center gap-1 text-sm text-white/50">
                <MapPin className="size-3.5" />
                {arena.cidade}/{arena.estado}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                <Users className="size-3" />
                {alunosAtivos ?? 0} alunos ativos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-6">

          {arena.descricao && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {arena.descricao}
            </p>
          )}

          <EntrarNaArenaButtons
            arenaId={arena.id}
            vinculo={vinculo}
            userId={user?.id ?? null}
          />

        </div>
      </div>
    </div>
  );
}
