import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star, Trophy, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublishedChampionships } from "@/lib/supabase/championships";
import { DestaquesEditor } from "@/components/admin/DestaquesEditor";
import { DestaquesArenasEditor } from "@/components/admin/DestaquesArenasEditor";
import type { ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";

export default async function AdminDestaquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const [campeonatos, arenaRows, configRow] = await Promise.all([
    getPublishedChampionships(),
    supabase
      .from("arenas")
      .select("id, nome, handle, cidade, estado, banner_url, avatar_url")
      .order("created_at", { ascending: false }),
    supabase
      .from("platform_config")
      .select("destaques_ids, arenas_destaques_ids")
      .eq("id", 1)
      .single(),
  ]);

  const destaquesIds: string[]       = (configRow.data?.destaques_ids as string[]        | null) ?? [];
  const arenasDestaquesIds: string[] = (configRow.data?.arenas_destaques_ids as string[] | null) ?? [];

  // Busca contagem de alunos para cada arena
  const arenaList = arenaRows.data ?? [];
  const counts = await Promise.all(
    arenaList.map(async (a) => {
      const { count } = await supabase
        .from("arena_students")
        .select("id", { count: "exact", head: true })
        .eq("arena_id", a.id)
        .eq("status", "ativo");
      return { id: a.id, alunos: count ?? 0 };
    }),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.alunos]));

  const arenas: ArenaDestaque[] = arenaList.map((a) => ({
    id: a.id,
    nome: a.nome,
    handle: a.handle,
    cidade: a.cidade,
    estado: a.estado,
    banner_url: a.banner_url ?? null,
    avatar_url: a.avatar_url ?? null,
    alunos: countMap[a.id] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-black px-6 pb-14 pt-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Admin
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Star className="size-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Destaques</h1>
              <p className="text-sm text-white/50">Escolha até 3 itens por seção.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-app-bg px-6 pb-16 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-12">

          {/* Campeonatos */}
          <section>
            <div className="mb-5 flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">Campeonatos em destaque</h2>
            </div>
            <DestaquesEditor campeonatos={campeonatos} initialDestaques={destaquesIds} />
          </section>

          <div className="border-t border-gray-100" />

          {/* Arenas */}
          <section>
            <div className="mb-5 flex items-center gap-2">
              <Building2 className="size-5 text-blue-500" />
              <h2 className="text-base font-semibold text-gray-900">Arenas em destaque</h2>
            </div>
            {arenas.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-400 ring-1 ring-black/5">
                Nenhuma arena cadastrada ainda.
              </p>
            ) : (
              <DestaquesArenasEditor arenas={arenas} initialDestaques={arenasDestaquesIds} />
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
