import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricoesBuscaLista } from "@/components/inscricoes/InscricoesBuscaLista";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { EmptyState } from "@/components/shell/EmptyState";

type RegRow = {
  id: string;
  category_id: string;
  status_pagamento: string;
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
      id, category_id, status_pagamento,
      teams(id, atleta1_id, atleta2_id),
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

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
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Inscrições" description="Duplas inscritas com pagamento confirmado nesse campeonato." />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label="Total de duplas" value={totalDuplas} icon={Users} />
        <StatCard label="Total de atletas" value={totalAtletas} icon={User} />
      </div>

      {totalDuplas === 0 ? (
        <EmptyState icon={Users} title="Nenhuma inscrição ainda" description="Assim que uma dupla pagar a inscrição, ela aparece aqui." />
      ) : (
        <>
          {/* Filtro por categoria */}
          {categorias.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Link
                href={`/painel/campeonatos/${id}/inscricoes`}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroAtivo === "todos"
                    ? "bg-blue-600 text-white"
                    : "bg-surface-2 text-ink-muted hover:bg-border/60"
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
                        ? "bg-blue-600 text-white"
                        : "bg-surface-2 text-ink-muted hover:bg-border/60"
                    }`}
                  >
                    {c.nome} ({count})
                  </Link>
                );
              })}
            </div>
          )}

          {lista.length === 0 ? (
            <EmptyState icon={Users} title="Nenhuma dupla nesta categoria" />
          ) : (
            <InscricoesBuscaLista lista={lista} />
          )}
        </>
      )}
    </PageContainer>
  );
}
