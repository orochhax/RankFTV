import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Championship,
  ChampionshipStatus,
  GeneroCategoria,
} from "@/lib/types";

// Campeonatos criados na plataforma (Supabase). Mapeamos as linhas do banco
// para o MESMO tipo Championship usado pelos mocks, então os cards, a lista e a
// página de detalhe renderizam sem nenhuma mudança. Duplas ficam vazias até a
// Fase 1 (inscrições).

type CatRow = {
  id: string;
  nome: string;
  genero: string;
  valor_inscricao: number;
  corte_rating_min: number;
  corte_rating_max: number;
  max_duplas: number | null;
};

type ChampRow = {
  id: string;
  organizador_id: string;
  nome: string;
  descricao: string;
  regulamento: string;
  data_inicio: string;
  data_fim: string;
  cidade: string;
  estado: string;
  local: string;
  status: string;
  taxa_plataforma: number;
  live_url: string | null;
  banner_url: string | null;
  is_vitrine: boolean | null;
  usa_motor_categoria: boolean | null;
  prevenda_inicio: string | null;
  prevenda_fim: string | null;
  championship_categories: CatRow[] | null;
};

const SELECT =
  "id, organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status, taxa_plataforma, live_url, banner_url, is_vitrine, usa_motor_categoria, prevenda_inicio, prevenda_fim, championship_categories(id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max, max_duplas)";

const GRADIENTS: [string, string][] = [
  ["from-blue-500", "to-cyan-400"],
  ["from-blue-500", "to-blue-400"],
  ["from-orange-500", "to-amber-400"],
  ["from-violet-500", "to-purple-400"],
  ["from-rose-500", "to-pink-400"],
  ["from-indigo-500", "to-blue-400"],
];

function mapChampionship(row: ChampRow): Championship {
  const gradientIndex =
    row.id.charCodeAt(0) % GRADIENTS.length;
  const [bannerFrom, bannerTo] = GRADIENTS[gradientIndex];
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    regulamento: row.regulamento,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    cidade: row.cidade,
    estado: row.estado,
    local: row.local,
    status: row.status as ChampionshipStatus,
    organizadorId: row.organizador_id,
    taxaPlataforma: row.taxa_plataforma,
    bannerFrom,
    bannerTo,
    bannerUrl: row.banner_url ?? null,
    liveUrl: row.live_url,
    isVitrine: row.is_vitrine ?? false,
    usaMotorCategoria: row.usa_motor_categoria ?? true,
    prevendaInicio: row.prevenda_inicio,
    prevendaFim: row.prevenda_fim,
    categorias: (row.championship_categories ?? []).map(
      (c): Category => ({
        id: c.id,
        nome: c.nome,
        genero: c.genero as GeneroCategoria,
        valorInscricao: c.valor_inscricao,
        corteRatingMin: c.corte_rating_min,
        corteRatingMax: c.corte_rating_max,
        maxDuplas: c.max_duplas ?? undefined,
      }),
    ),
  };
}

// Para a lista pública de Campeonatos — só os publicados (não rascunho).
export async function getPublishedChampionships(): Promise<Championship[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("championships")
    .select(SELECT)
    .neq("status", "rascunho")
    .order("data_inicio", { ascending: true });
  if (error || !data) return [];
  return (data as ChampRow[]).map(mapChampionship);
}

// Campeonatos em andamento agora (para o card "Ao vivo" na Home).
export async function getLivChampionships(): Promise<Championship[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("championships")
    .select(SELECT)
    .eq("status", "em_andamento")
    .order("data_inicio", { ascending: false });
  if (error || !data) return [];
  return (data as ChampRow[]).map(mapChampionship);
}

// Para o Painel — todos os campeonatos do organizador logado (inclui rascunhos).
export async function getMyChampionships(userId: string): Promise<Championship[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("championships")
    .select(SELECT)
    .eq("organizador_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ChampRow[]).map(mapChampionship);
}

// Para a página de detalhe quando o id não é de um mock. Os ids do banco são
// uuid; ids de mock são slugs (ex.: "copa-litoral-ftv"), então filtramos antes
// de consultar pra não disparar erro de "uuid inválido".
export async function getDbChampionshipById(
  id: string,
): Promise<Championship | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("championships")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapChampionship(data as ChampRow);
}
