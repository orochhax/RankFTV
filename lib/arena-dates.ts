// Datas e ocorrências recorrentes do painel da arena — módulo central.
//
// arena_classes guarda aulas recorrentes por dia da semana (dias_semana +
// horario), não uma linha por ocorrência. Toda a matemática de calendário
// (semana seg-dom, navegação de mês/ano, geração de ocorrências dentro de um
// intervalo) fica aqui, em funções puras, pra não duplicar lógica de data
// entre a página server e o componente client do calendário.
//
// Convenção de datas: sempre `new Date(year, monthIndex, day)` com
// componentes locais — nunca parse de string ISO direto (`new Date(iso)`),
// que o JS interpreta como UTC e pode empurrar o dia pra trás/frente
// dependendo do fuso do servidor. Isso também evita qualquer dependência de
// timezone: a data "civil" (ano/mês/dia) já vem correta do banco/URL, só
// precisamos fazer aritmética de calendário nela.

export const ARENA_TZ = "America/Sao_Paulo";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

export function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "Hoje" no fuso de Brasília, como data ISO (YYYY-MM-DD). */
export function todayISOArena(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ARENA_TZ });
}

/** 0=Dom .. 6=Sáb, calculado em tempo local (sem parsing UTC). */
export function dowOfISO(iso: string): number {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d).getDay();
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  return dateToISO(new Date(y, m - 1, d + days));
}

/** Soma meses preservando o dia quando possível, com clamp no fim do mês
 * de destino (ex.: 31 jan + 1 mês -> 28/29 fev). */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const base = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return dateToISO(new Date(base.getFullYear(), base.getMonth(), Math.min(d, lastDay)));
}

export function addYearsISO(iso: string, years: number): string {
  return addMonthsISO(iso, years * 12);
}

/** Semana seg-dom que contém a data. */
export function weekRangeISO(iso: string): { start: string; end: string } {
  const dow = dowOfISO(iso); // 0=Dom .. 6=Sáb
  const diffToMonday = (dow + 6) % 7; // Seg=0 .. Dom=6
  const start = addDaysISO(iso, -diffToMonday);
  return { start, end: addDaysISO(start, 6) };
}

export function startOfMonthISO(iso: string): string {
  const [y, m] = parts(iso);
  return dateToISO(new Date(y, m - 1, 1));
}

export function endOfMonthISO(iso: string): string {
  const [y, m] = parts(iso);
  return dateToISO(new Date(y, m, 0));
}

export function startOfYearISO(iso: string): string {
  const [y] = parts(iso);
  return dateToISO(new Date(y, 0, 1));
}

export function endOfYearISO(iso: string): string {
  const [y] = parts(iso);
  return dateToISO(new Date(y, 11, 31));
}

/** Matriz de 6 semanas (seg-dom, 42 células) cobrindo o mês, com dias dos
 * meses vizinhos nas pontas — formato padrão de mini-calendário. */
export function monthMatrixISO(iso: string): string[][] {
  const [y, m] = parts(iso);
  const first = new Date(y, m - 1, 1);
  const firstDow = (first.getDay() + 6) % 7; // Seg=0
  const start = new Date(y, m - 1, 1 - firstDow);
  const weeks: string[][] = [];
  let cur = start;
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(dateToISO(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_SEMANA_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const MESES_PT_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function monthLabel(iso: string): string {
  const [y, m] = parts(iso);
  return `${MESES_PT[m - 1]} de ${y}`;
}

export function weekLabel(iso: string): string {
  const { start, end } = weekRangeISO(iso);
  const [ys, ms, ds] = parts(start);
  const [ye, me, de] = parts(end);
  if (ms === me) return `${ds} a ${de} de ${MESES_PT[ms - 1]}, ${ye}`;
  if (ys === ye) return `${ds} ${MESES_PT_ABREV[ms - 1]} a ${de} ${MESES_PT_ABREV[me - 1]}, ${ye}`;
  return `${ds} ${MESES_PT_ABREV[ms - 1]}/${ys} a ${de} ${MESES_PT_ABREV[me - 1]}/${ye}`;
}

export function dayLabel(iso: string): string {
  const [, m, d] = parts(iso);
  return `${DIAS_SEMANA_LONGO[dowOfISO(iso)]}, ${d} de ${MESES_PT[m - 1]}`;
}

/** Versão compacta pra listas (ex.: "Segunda, 14 jul.") — usada no resumo
 * semanal, onde `dayLabel` (mês por extenso) ocupa espaço demais. */
export function dayLabelShort(iso: string): string {
  const [, m, d] = parts(iso);
  return `${DIAS_SEMANA_LONGO[dowOfISO(iso)]}, ${d} ${MESES_PT_ABREV[m - 1]}.`;
}

export const NIVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export type NivelFiltro = "todos" | "iniciante" | "intermediario" | "avancado" | "sem_categoria";

export const NIVEL_FILTRO_OPCOES: { value: NivelFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "sem_categoria", label: "Sem categoria" },
];

export function classeCombinaComFiltro(nivel: string | null, filtro: NivelFiltro): boolean {
  if (filtro === "todos") return true;
  if (filtro === "sem_categoria") return nivel == null;
  return nivel === filtro;
}

export type PublicoAula = "misto" | "masculino" | "feminino";

export type ArenaClassRow = {
  id: string;
  titulo: string;
  horaInicio: string | null;
  horaFim: string | null;
  diasSemana: number[];
  nivel: string | null;
  maxAlunos: number | null;
  ativo: boolean;
  publico?: PublicoAula;
};

/**
 * Colunas `time` do Postgres voltam do Supabase como "HH:MM:SS", não
 * "HH:MM" — normaliza no primeiro ponto de leitura de arena_classes
 * (hora_inicio/hora_fim), antes de qualquer exibição ou de montar um Date
 * pra comparação de horário. Sem isso, tanto a UI mostra os segundos quanto
 * `new Date(`${data}T${hora}:00`)` monta uma string de data inválida.
 */
export function hhmm(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.slice(0, 5);
}

/** "HH:mm - HH:mm", ou só o início se não houver término salvo (dados legados). */
export function horarioLabel(horaInicio: string | null, horaFim: string | null): string | null {
  if (!horaInicio) return null;
  return horaFim ? `${horaInicio} - ${horaFim}` : horaInicio;
}

/**
 * Regra única de validação do horário da aula, usada no cliente
 * (AulasManager) e no servidor (criarAula/editarAula) — os dois precisam
 * concordar, senão o cliente aceita algo que o servidor rejeita ou vice-versa.
 * Retorna a mensagem de erro, ou null se válido. Os dois campos vazios
 * também é válido (aula sem horário fixo).
 */
export function validarIntervaloHorario(horaInicio: string, horaFim: string): string | null {
  if ((horaInicio && !horaFim) || (!horaInicio && horaFim)) {
    return "Informe o horário de início e de término, ou deixe os dois em branco.";
  }
  if (horaInicio && horaFim && horaFim <= horaInicio) {
    return "O horário de término precisa ser depois do horário de início.";
  }
  return null;
}

export const PUBLICO_LABEL: Record<PublicoAula, string> = {
  misto: "Misto",
  masculino: "Masculino",
  feminino: "Feminino",
};

export type ClassOccurrence = {
  classId: string;
  date: string;
  titulo: string;
  horaInicio: string | null;
  horaFim: string | null;
  nivel: string | null;
  maxAlunos: number | null;
  publico: PublicoAula;
};

/** Gera as ocorrências de aulas recorrentes dentro de [startISO, endISO],
 * sem persistir nada — puramente derivado de dias_semana. O guard de
 * iterações evita loop indevido caso o intervalo seja passado invertido. */
export function generateOccurrences(
  classes: ArenaClassRow[],
  startISO: string,
  endISO: string,
): ClassOccurrence[] {
  const out: ClassOccurrence[] = [];
  if (startISO > endISO) return out;
  const ativas = classes.filter((c) => c.ativo);
  let cur = startISO;
  let guard = 0;
  while (cur <= endISO && guard < 380) {
    const dow = dowOfISO(cur);
    for (const c of ativas) {
      if (!c.diasSemana.includes(dow)) continue;
      out.push({
        classId: c.id,
        date: cur,
        titulo: c.titulo,
        horaInicio: c.horaInicio,
        horaFim: c.horaFim,
        nivel: c.nivel,
        maxAlunos: c.maxAlunos,
        publico: c.publico ?? "misto",
      });
    }
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return out.sort((a, b) => (a.date === b.date
    ? (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "")
    : a.date.localeCompare(b.date)));
}
