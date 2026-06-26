import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { ArenaCard, type ArenaCardData } from "@/components/arenas/ArenaCard";
import { ArenaSection } from "@/components/arenas/ArenaSection";
import { createClient } from "@/lib/supabase/server";

export default async function ArenasPage() {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, descricao, avatar_url, banner_url")
    .order("created_at", { ascending: false });

  const rows = raw ?? [];

  // Busca contagem de alunos ativos por arena
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

  const destaques = arenas.slice(0, 3);
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
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Arenas</h1>
            <Link
              href="/perfil/ativar-arena"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/15 transition-colors"
            >
              <Plus className="size-4" /> Cadastrar arena
            </Link>
          </div>

          {/* Destaques — as 3 primeiras arenas em scroll horizontal no header */}
          {destaques.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                Em destaque
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {destaques.map((a) => (
                  <Link
                    key={a.id}
                    href={`/arenas/${a.handle}`}
                    className="relative flex-shrink-0 h-32 w-52 overflow-hidden rounded-2xl"
                  >
                    {a.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.banner_url} alt={a.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
                        <Building2 className="size-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                      <p className="truncate text-sm font-semibold text-white">{a.nome}</p>
                      <p className="text-[10px] text-white/60">{a.cidade}/{a.estado}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção branca ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <ArenaSection allArenas={arenas} estados={estados} />
        </div>
      </div>
    </div>
  );
}
