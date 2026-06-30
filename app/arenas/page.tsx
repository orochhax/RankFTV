import Link from "next/link";
import { Building2 } from "lucide-react";
import { DestaquesArenasCarousel, type ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";
import { ArenaSection } from "@/components/arenas/ArenaSection";
import type { ArenaCardData, ProximaData } from "@/components/arenas/ArenaCard";
import { createClient } from "@/lib/supabase/server";

const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function computeProximasDatas(diasSemana: number[], count = 7): ProximaData[] {
  if (!diasSemana.length) return [];
  const result: ProximaData[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  let tries = 0;
  while (result.length < count && tries < 60) {
    if (diasSemana.includes(d.getDay())) {
      result.push({ dia: d.getDate(), label: DIAS_LABEL[d.getDay()] });
    }
    d.setDate(d.getDate() + 1);
    tries++;
  }
  return result;
}

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
  const arenaIds = rows.map((r) => r.id);

  // Busca contagem de alunos e dias de aula em paralelo
  const [counts, classesRows, photosRows] = await Promise.all([
    Promise.all(
      rows.map(async (a) => {
        const { count } = await supabase
          .from("arena_students")
          .select("id", { count: "exact", head: true })
          .eq("arena_id", a.id)
          .eq("status", "ativo");
        return { id: a.id, alunos: count ?? 0 };
      }),
    ),
    arenaIds.length > 0
      ? supabase
          .from("arena_classes")
          .select("arena_id, dias_semana")
          .in("arena_id", arenaIds)
          .eq("ativo", true)
      : { data: [] as { arena_id: string; dias_semana: number[] | null }[] },
    arenaIds.length > 0
      ? supabase
          .from("arena_photos")
          .select("arena_id, url")
          .in("arena_id", arenaIds)
          .order("ordem", { ascending: true })
      : { data: [] as { arena_id: string; url: string }[] },
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.alunos]));

  // Primeira foto de cada arena (menor ordem)
  const firstPhotoMap: Record<string, string> = {};
  for (const p of (photosRows.data ?? []) as { arena_id: string; url: string }[]) {
    if (!firstPhotoMap[p.arena_id]) firstPhotoMap[p.arena_id] = p.url;
  }

  // Agrupa dias da semana por arena (union de todas as turmas ativas)
  const diasMap: Record<string, Set<number>> = {};
  for (const cl of (classesRows.data ?? []) as { arena_id: string; dias_semana: number[] | null }[]) {
    if (!diasMap[cl.arena_id]) diasMap[cl.arena_id] = new Set();
    for (const d of cl.dias_semana ?? []) diasMap[cl.arena_id].add(d);
  }

  const arenas: ArenaCardData[] = rows.map((a) => {
    const diasSemana = Array.from(diasMap[a.id] ?? []).sort();
    return {
      id: a.id,
      nome: a.nome,
      handle: a.handle,
      cidade: a.cidade,
      estado: a.estado,
      descricao: a.descricao ?? null,
      avatar_url: a.avatar_url ?? null,
      banner_url: firstPhotoMap[a.id] ?? a.banner_url ?? null,
      alunos: countMap[a.id] ?? 0,
      proximasDatas: computeProximasDatas(diasSemana),
    };
  });

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
            <p className="font-semibold text-gray-700">Nenhuma arena encontrada</p>
            <p className="mt-1 text-sm text-gray-400">Ainda não há arenas cadastradas na plataforma.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-10 pt-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">Arenas</h1>
          <p className="mt-3 text-sm text-white/50">
            Alugue uma quadra por hora ou assine um plano mensal de treino.
          </p>
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
