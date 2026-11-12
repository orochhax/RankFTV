import Link from "next/link";
import { Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { DestaquesArenasCarousel, type ArenaDestaque } from "@/components/arenas/DestaquesArenasCarousel";
import { ArenaSection } from "@/components/arenas/ArenaSection";
import type { ArenaCardData, ProximaData } from "@/components/arenas/ArenaCard";
import { PageContainer } from "@/components/shell/PageContainer";
import { DesktopSheetContourLight } from "@/components/shell/DesktopSheetContourLight";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isDemoArenaIdentifier } from "@/lib/arena-demo";
import { canAccessDemoArena } from "@/lib/arena-demo-access";

export const metadata = {
  title: "Arenas & Centros de Treinamento — RankFTV",
  description: "Encontre centros de treinamento de futevôlei, consulte horários de aulas e faça sua matrícula.",
};

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
  const isDemo = isDemoArenaIdentifier(row.id) || isDemoArenaIdentifier(row.handle);
  return {
    id: row.id,
    nome: row.nome,
    handle: row.handle,
    cidade: row.cidade,
    estado: row.estado,
    descricao: row.descricao,
    avatar_url: row.avatar_url,
    banner_url: isDemo ? (row.banner_url ?? "/arenas/rank-football-destaque.webp") : row.banner_url,
    card_banner_url: isDemo ? "/arenas/rank-football-card.webp" : undefined,
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

  const [{ data: pageData }, { data: config }, canSeeDemo] = await Promise.all([
    supabase.rpc("list_public_arena_cards", {
      p_query: query || null,
      p_estado: estado || null,
      p_ids: null,
      p_limit: PAGE_SIZE + 1,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
    supabase.from("platform_config").select("arenas_destaques_ids").eq("id", 1).maybeSingle(),
    canAccessDemoArena(supabase),
  ]);

  const rawRows = (pageData ?? []) as unknown as ArenaRpcRow[];
  const visibleRows = (
    canSeeDemo ? rawRows : rawRows.filter((row) => !isDemoArenaIdentifier(row.id) && !isDemoArenaIdentifier(row.handle))
  ).slice(0, PAGE_SIZE);
  const arenas = visibleRows.map(toCard);

  let hiddenDemoMatches = 0;
  if (!canSeeDemo) {
    let demoCheck = supabase
      .from("arenas")
      .select("id", { count: "exact", head: true })
      .eq("id", "a1000000-0000-4000-8000-000000000001");
    if (query) demoCheck = demoCheck.ilike("nome", `%${query}%`);
    if (estado) demoCheck = demoCheck.eq("estado", estado);
    const { count: demoCount } = await demoCheck;
    hiddenDemoMatches = demoCount ?? 0;
  }

  const rawTotal = Number(rawRows[0]?.total_count ?? 0);
  const total = Math.max(0, rawTotal - hiddenDemoMatches);

  if (visibleRows.length === 0 && page > 1) {
    const { data: firstRow } = await supabase.rpc("list_public_arena_cards", {
      p_query: query || null,
      p_estado: estado || null,
      p_ids: null,
      p_limit: 1,
      p_offset: 0,
    });
    const actualRawTotal = Number(((firstRow ?? [])[0] as ArenaRpcRow | undefined)?.total_count ?? 0);
    const actualTotal = Math.max(0, actualRawTotal - hiddenDemoMatches);
    const lastPage = Math.max(1, Math.ceil(actualTotal / PAGE_SIZE));
    const corrected = new URLSearchParams();
    if (query) corrected.set("q", query);
    if (estado) corrected.set("estado", estado);
    if (lastPage > 1) corrected.set("page", String(lastPage));
    redirect(`/arenas${corrected.size > 0 ? `?${corrected}` : ""}`);
  }

  const featuredIdsRaw = ((config?.arenas_destaques_ids as string[] | null) ?? []).slice(0, 3);
  const featuredIds = canSeeDemo
    ? featuredIdsRaw
    : featuredIdsRaw.filter((id) => !isDemoArenaIdentifier(id));
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
      const cards = ((data ?? []) as unknown as ArenaRpcRow[])
        .filter((row) => canSeeDemo || !isDemoArenaIdentifier(row.id))
        .map(toCard);
      destaques = featuredIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean) as ArenaDestaque[];
    } else {
      destaques = arenas.slice(0, 3);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Tarja Mobile Compacta de Conversão para Donos */}
      <div className="bg-brand-dark-2 border-b border-white/10 px-4 py-2.5 text-white shadow-sm md:hidden">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Building2 className="size-4 shrink-0 text-accent" />
            <span className="truncate">É professor ou dono de arena?</span>
          </div>
          <Link
            href="/arenas/para-donos"
            className="shrink-0 rounded-lg bg-brand px-2.5 py-1 font-bold text-white transition active:bg-brand-hover"
          >
            Divulgue aqui →
          </Link>
        </div>
      </div>

      {/* Header Principal */}
      <div className="bg-brand-dark px-6 pb-14 pt-8">
        <PageContainer width="wide">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">
                  <ShieldCheck className="size-3" />
                  Centros de Treinamento
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Arenas & CTs de Futevôlei
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-white/70">
                Encontre arenas na sua região, consulte turmas, valores e faça sua matrícula direto pelo app.
              </p>
            </div>

            {/* Botão de Conversão para Donos (Desktop) */}
            <div className="hidden shrink-0 sm:block">
              <Link
                href="/arenas/para-donos"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-ink active:scale-95"
              >
                <Building2 className="size-4 text-accent" />
                Sou dono de arena
                <ArrowRight className="size-4 opacity-70" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Conteúdo da Página (Sheet Contour) */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:pb-16">
        <DesktopSheetContourLight />
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
