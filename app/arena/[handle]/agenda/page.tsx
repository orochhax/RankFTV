import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArenaAgendaClient } from "@/components/arena/ArenaAgendaClient";
import {
  todayISOArena, weekRangeISO, startOfYearISO, endOfYearISO,
  monthMatrixISO, generateOccurrences, classeCombinaComFiltro, hhmm,
  type ArenaClassRow, type NivelFiltro,
} from "@/lib/arena-dates";

export type ArenaAgendaView = "ano" | "mes" | "semana" | "dia";

const VIEWS: ArenaAgendaView[] = ["ano", "mes", "semana", "dia"];
const NIVEIS: NivelFiltro[] = ["todos", "iniciante", "intermediario", "avancado", "sem_categoria"];

function parseView(raw: string | undefined): ArenaAgendaView {
  return VIEWS.includes(raw as ArenaAgendaView) ? (raw as ArenaAgendaView) : "semana";
}

function parseNivel(raw: string | undefined): NivelFiltro {
  return NIVEIS.includes(raw as NivelFiltro) ? (raw as NivelFiltro) : "todos";
}

function parseData(raw: string | undefined): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayISOArena();
}

export default async function ArenaAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ view?: string; data?: string; nivel?: string }>;
}) {
  const { handle } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/agenda`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const view = parseView(sp.view);
  const anchorDate = parseData(sp.data);
  const nivelFiltro = parseNivel(sp.nivel);
  const todayISO = todayISOArena();

  const { data: aulasRaw } = await supabase
    .from("arena_classes")
    .select("id, titulo, hora_inicio, hora_fim, dias_semana, nivel, publico, max_alunos, ativo")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("hora_inicio", { ascending: true });

  const classes: ArenaClassRow[] = (aulasRaw ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    horaInicio: hhmm(c.hora_inicio),
    horaFim: hhmm(c.hora_fim),
    diasSemana: c.dias_semana ?? [],
    nivel: c.nivel,
    maxAlunos: c.max_alunos,
    ativo: c.ativo,
    publico: (c.publico ?? "misto") as ArenaClassRow["publico"],
  }));

  // Intervalo visível — determina tanto a geração de ocorrências (derivada,
  // sem custo de banco) quanto o intervalo de presenças buscado (só quando
  // realmente precisa de detalhe: visualizações de semana e dia).
  let rangeStart: string;
  let rangeEnd: string;
  let monthMatrix: string[][] | null = null;

  if (view === "dia") {
    rangeStart = anchorDate;
    rangeEnd = anchorDate;
  } else if (view === "semana") {
    const { start, end } = weekRangeISO(anchorDate);
    rangeStart = start;
    rangeEnd = end;
  } else if (view === "mes") {
    monthMatrix = monthMatrixISO(anchorDate);
    rangeStart = monthMatrix[0][0];
    rangeEnd = monthMatrix[monthMatrix.length - 1][6];
  } else {
    rangeStart = startOfYearISO(anchorDate);
    rangeEnd = endOfYearISO(anchorDate);
  }

  const buscaPresenca = view === "semana" || view === "dia";

  const presencasMap = new Map<string, number>();
  if (buscaPresenca) {
    const { data: presencas } = await supabase
      .from("arena_attendance")
      .select("class_id, data")
      .eq("arena_id", arena.id)
      .gte("data", rangeStart)
      .lte("data", rangeEnd);
    for (const p of presencas ?? []) {
      const chave = `${p.class_id}|${p.data}`;
      presencasMap.set(chave, (presencasMap.get(chave) ?? 0) + 1);
    }
  }

  const ocorrencias = generateOccurrences(classes, rangeStart, rangeEnd)
    .filter((o) => classeCombinaComFiltro(o.nivel, nivelFiltro))
    .map((o) => ({
      ...o,
      confirmados: buscaPresenca ? presencasMap.get(`${o.classId}|${o.date}`) ?? 0 : null,
    }));

  return (
    <ArenaAgendaClient
      handle={arena.handle}
      view={view}
      anchorDate={anchorDate}
      nivelFiltro={nivelFiltro}
      todayISO={todayISO}
      occurrences={ocorrencias}
      monthMatrix={monthMatrix}
      hasClasses={classes.length > 0}
    />
  );
}
