import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoItem } from "@/components/inscricoes/InscricaoItem";

type RegRow = {
  id: string;
  category_id: string;
  teams: { id: string; atleta1_id: string; atleta2_id: string | null } | null;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

type ProfileRow = { id: string; nome: string; nivel: string | null };

type DuplaDisplay = {
  id: string;
  a1: { nome: string; nivel: string | null };
  a2: { nome: string; nivel: string | null } | null;
  catId: string;
  catNome: string;
};

export default async function InscricoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id }  = await params;
  const { cat } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`
      id, category_id,
      teams(id, atleta1_id, atleta2_id),
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id);

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  // Batch-fetch perfis
  const athleteIds = [
    ...new Set(
      regs.flatMap((r) =>
        r.teams
          ? [r.teams.atleta1_id, ...(r.teams.atleta2_id ? [r.teams.atleta2_id] : [])]
          : [],
      ),
    ),
  ];

  let profileMap: Record<string, ProfileRow> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", athleteIds);
    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, { ...p, nivel: null } as ProfileRow]),
    );
  }

  // Monta lista de duplas com nomes resolvidos
  const duplas: DuplaDisplay[] = regs
    .map((reg) => {
      const team = reg.teams;
      const cat  = reg.championship_categories;
      if (!team || !cat) return null;

      const a1raw = profileMap[team.atleta1_id];
      const a2raw = team.atleta2_id ? profileMap[team.atleta2_id] : null;

      return {
        id:      reg.id,
        a1:      { nome: a1raw?.nome ?? "Atleta 1", nivel: a1raw?.nivel ?? null },
        a2:      a2raw ? { nome: a2raw.nome, nivel: a2raw.nivel ?? null } : null,
        catId:   cat.id,
        catNome: cat.nome,
      } satisfies DuplaDisplay;
    })
    .filter((d): d is DuplaDisplay => d !== null)
    .sort((a, b) => a.a1.nome.localeCompare(b.a1.nome, "pt-BR"));

  // Categorias únicas para o filtro
  const categorias = Array.from(
    new Map(
      regs
        .filter((r) => r.championship_categories)
        .map((r) => [r.championship_categories!.id, r.championship_categories!]),
    ).values(),
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const filtroAtivo = cat && categorias.some((c) => c.id === cat) ? cat : "todos";

  const lista =
    filtroAtivo === "todos"
      ? duplas
      : duplas.filter((d) => d.catId === filtroAtivo);

  const totalDuplas   = duplas.length;
  const totalAtletas  = duplas.reduce((s, d) => s + (d.a2 ? 2 : 1), 0);

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Inscrições</h1>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Total de duplas</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{totalDuplas}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Total de atletas</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{totalAtletas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-4">

          {totalDuplas === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Users className="size-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Nenhuma inscrição ainda.</p>
            </div>
          ) : (
            <>
              {/* Filtro por categoria */}
              {categorias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Link
                    href={`/painel/campeonatos/${id}/inscricoes`}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      filtroAtivo === "todos"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    Todos ({totalDuplas})
                  </Link>
                  {categorias.map((c) => {
                    const count = duplas.filter((d) => d.catId === c.id).length;
                    return (
                      <Link
                        key={c.id}
                        href={`/painel/campeonatos/${id}/inscricoes?cat=${c.id}`}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                          filtroAtivo === c.id
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {c.nome} ({count})
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Lista em ordem alfabética */}
              {lista.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-black/5">
                  <p className="text-sm text-gray-400">Nenhuma dupla nesta categoria.</p>
                </div>
              ) : (
                <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                  {lista.map((d) => (
                    <InscricaoItem
                      key={d.id}
                      a1={d.a1}
                      a2={d.a2}
                      catNome={d.catNome}
                    />
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
