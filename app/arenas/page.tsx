import { DestaquesArenasCarousel, type ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";
import { ArenaSection } from "@/components/arenas/ArenaSection";
import type { ArenaCardData, ProximaData } from "@/components/arenas/ArenaCard";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const PAGE_SIZE = 12;
const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

type ArenaRpcRow = {
  id: string;
  nome: string;
  handle: string;
  cidade: string;
  estado: string;
  descricao: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  alunos: number | string;
  dias_semana: number[] | null;
  total_count: number | string;
};

function computeNextDates(daysOfWeek: number[], count = 7): ProximaData[] {
  if (!daysOfWeek.length) return [];
  const result: ProximaData[] = [];
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  for (let attempts = 0; result.length < count && attempts < 60; attempts++) {
    if (daysOfWeek.includes(date.getDay())) {
      result.push({ dia: date.getDate(), label: DIAS_LABEL[date.getDay()] });
    }
    date.setDate(date.getDate() + 1);
  }
  return result;
}

function toCard(row: ArenaRpcRow): ArenaCardData {
  return {
    id: row.id,
    nome: row.nome,
    handle: row.handle,
    cidade: row.cidade,
    estado: row.estado,
    descricao: row.descricao,
    avatar_url: row.avatar_url,
    banner_url: row.banner_url,
    alunos: Number(row.alunos ?? 0),
    proximasDatas: computeNextDates(row.dias_semana ?? []),
  };
}

export default async function ArenasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = String(params.q ?? "").trim().slice(0, 80);
  const estado = ESTADOS.includes(String(params.estado ?? "").toUpperCase())
    ? String(params.estado).toUpperCase()
    : "";
  const parsedPage = Number.parseInt(String(params.page ?? "1"), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10_000) : 1;
  const supabase = await createClient();

  const [{ data: pageData }, { data: config }] = await Promise.all([
    supabase.rpc("list_public_arena_cards", {
      p_query: query || null,
      p_estado: estado || null,
      p_ids: null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
    supabase.from("platform_config").select("arenas_destaques_ids").eq("id", 1).maybeSingle(),
  ]);

  const rows = (pageData ?? []) as unknown as ArenaRpcRow[];
  const arenas = rows.map(toCard);
  const total = Number(rows[0]?.total_count ?? 0);
  if (rows.length === 0 && page > 1) {
    const { data: firstRow } = await supabase.rpc("list_public_arena_cards", {
      p_query: query || null,
      p_estado: estado || null,
      p_ids: null,
      p_limit: 1,
      p_offset: 0,
    });
    const actualTotal = Number(((firstRow ?? [])[0] as ArenaRpcRow | undefined)?.total_count ?? 0);
    const lastPage = Math.max(1, Math.ceil(actualTotal / PAGE_SIZE));
    const corrected = new URLSearchParams();
    if (query) corrected.set("q", query);
    if (estado) corrected.set("estado", estado);
    if (lastPage > 1) corrected.set("page", String(lastPage));
    redirect(`/arenas${corrected.size > 0 ? `?${corrected}` : ""}`);
  }
  const featuredIds = ((config?.arenas_destaques_ids as string[] | null) ?? []).slice(0, 3);
  let destaques: ArenaDestaque[] = [];

  if (!query && !estado && page === 1) {
    if (featuredIds.length > 0) {
      const { data } = await supabase.rpc("list_public_arena_cards", {
        p_query: null,
        p_estado: null,
        p_ids: featuredIds,
        p_limit: 3,
        p_offset: 0,
      });
      const cards = ((data ?? []) as unknown as ArenaRpcRow[]).map(toCard);
      destaques = featuredIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean) as ArenaDestaque[];
    } else {
      destaques = arenas.slice(0, 3);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-10 pt-8 md:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Beta</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Arenas</h1>
        <p className="mt-3 text-sm text-white/50">Encontre arenas e consulte aulas, planos e horários disponíveis.</p>
      </div>
      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="wide" className="py-6">
          <PageHeader title="Arenas · Beta" description="Encontre arenas e consulte aulas, planos e horários disponíveis." />
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />
        <PageContainer width="wide" className="space-y-8">
          {destaques.length > 0 && <DestaquesArenasCarousel arenas={destaques} />}
          <ArenaSection
            arenas={arenas}
            estados={ESTADOS}
            query={query}
            estado={estado}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </PageContainer>
      </div>
    </div>
  );
}
