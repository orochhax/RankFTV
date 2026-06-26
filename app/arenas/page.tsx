import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { DestaquesArenasCarousel, type ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";
import { ArenaSection } from "@/components/arenas/ArenaSection";
import type { ArenaCardData } from "@/components/arenas/ArenaCard";
import { createClient } from "@/lib/supabase/server";

export default async function ArenasPage() {
  const supabase = await createClient();

  const [arenaRows, configRow] = await Promise.all([
    supabase
      .from("arenas")
      .select("id, nome, handle, cidade, estado, descricao, avatar_url, banner_url")
      .order("created_at", { ascending: false }),
    supabase
      .from("platform_config")
      .select("arenas_destaques_ids")
      .eq("id", 1)
      .single(),
  ]);

  const rows = arenaRows.data ?? [];

  // Contagem de alunos por arena
  const counts = await Promise.all(
    rows.map(async (a) => {
      const { count } = await supabase
        .from("arena_students")
        .select("id", { count: "exact", head: true })
        .eq("arena_id", a.id)
        .eq("status", "ativo");
      return { id: a.id, alunos: count ?? 0 };
    }),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.alunos]));

  const arenas: ArenaCardData[] = rows.map((a) => ({
    id: a.id,
    nome: a.nome,
    handle: a.handle,
    cidade: a.cidade,
    estado: a.estado,
    descricao: a.descricao ?? null,
    avatar_url: a.avatar_url ?? null,
    banner_url: a.banner_url ?? null,
    alunos: countMap[a.id] ?? 0,
  }));

  // Destaques configurados no admin (ou 3 primeiras como fallback)
  const destaquesIds: string[] = (configRow.data?.arenas_destaques_ids as string[] | null) ?? [];
  const destaques: ArenaDestaque[] = destaquesIds.length > 0
    ? destaquesIds
        .map((id) => arenas.find((a) => a.id === id))
        .filter(Boolean) as ArenaDestaque[]
    : arenas.slice(0, 3);

  const estados = Array.from(new Set(arenas.map((a) => a.estado))).sort();

  if (arenas.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold tracking-tight text-white">Arenas</h1>
          </div>
        </div>
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-12 shadow-sm">
          <div className="mx-auto max-w-5xl py-12 text-center">
            <Building2 className="mx-auto mb-4 size-12 text-gray-200" />
            <p className="font-semibold text-gray-700">Em breve</p>
            <p className="mt-1 text-sm text-gray-400">As primeiras arenas parceiras chegam em breve.</p>
            <Link
              href="/perfil/ativar-arena"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="size-4" /> Cadastrar minha arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Arenas</h1>
            <Link
              href="/perfil/ativar-arena"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/15 transition-colors"
            >
              <Plus className="size-4" /> Cadastrar arena
            </Link>
          </div>
        </div>
      </div>

      {/* ── Seção branca ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Destaques — mesmo carrossel dos campeonatos */}
          {destaques.length > 0 && (
            <DestaquesArenasCarousel arenas={destaques} />
          )}

          {/* Filtros + lista completa */}
          <ArenaSection allArenas={arenas} estados={estados} />

        </div>
      </div>
    </div>
  );
}
