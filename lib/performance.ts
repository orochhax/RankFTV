// Cálculos do painel de Performance. Tudo puro (sem I/O) pra rodar igual no
// server (página) e poder testar fácil. Aderência é sempre 0..1; formate com
// pct() na hora de exibir.

export type HabitTipo = "binario" | "numerico";

export type Habit = {
  id: string;
  label: string;
  tipo: HabitTipo;
  alvo: number | null;
  unidade: string | null;
  ordem: number;
  ativo: boolean;
};

export type HabitLog = {
  habit_id: string;
  data: string; // 'yyyy-mm-dd'
  valor: number;
};

// ── Datas (string yyyy-mm-dd, sem fuso pra não dançar perto da meia-noite) ──
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Hoje no fuso do Brasil (o server roda em UTC na Vercel). */
export function hojeISO(tz = "America/Sao_Paulo"): string {
  // en-CA formata como yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function pct(n: number): number {
  return Math.round(n * 100);
}

// ── Aderência ───────────────────────────────────────────────────────────────
/** Aderência de um hábito (0..1) dado o valor realizado. */
export function adherence(habit: Habit, valor: number | undefined | null): number {
  if (valor == null) return 0;
  if (habit.tipo === "binario") return valor >= 1 ? 1 : 0;
  if (!habit.alvo || habit.alvo <= 0) return valor > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, valor / habit.alvo));
}

/** Mapa data -> (habit_id -> valor). */
export function indexLogs(logs: HabitLog[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  for (const l of logs) {
    (map[l.data] ??= {})[l.habit_id] = Number(l.valor);
  }
  return map;
}

/** Score do dia (0..1) = média da aderência de TODOS os hábitos ativos. */
export function dayScore(
  habits: Habit[],
  valoresDoDia: Record<string, number> | undefined,
): number {
  const ativos = habits.filter((h) => h.ativo);
  if (ativos.length === 0) return 0;
  const soma = ativos.reduce((s, h) => s + adherence(h, valoresDoDia?.[h.id]), 0);
  return soma / ativos.length;
}

function temRegistro(v: Record<string, number> | undefined): boolean {
  return !!v && Object.keys(v).length > 0;
}

// Média do score do dia numa janela [start, end], só contando dias que têm
// registro (não pune por não ter aberto o app — mas a falta aparece no mapa).
function avgScore(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  startISO: string,
  endISO: string,
): { media: number; dias: number } {
  let soma = 0, dias = 0, cur = startISO;
  while (cur <= endISO) {
    if (temRegistro(idx[cur])) { soma += dayScore(habits, idx[cur]); dias++; }
    cur = addDays(cur, 1);
  }
  return { media: dias ? soma / dias : 0, dias };
}

function avgHabit(
  habit: Habit,
  idx: Record<string, Record<string, number>>,
  startISO: string,
  endISO: string,
): { media: number; dias: number } {
  let soma = 0, dias = 0, cur = startISO;
  while (cur <= endISO) {
    if (temRegistro(idx[cur])) { soma += adherence(habit, idx[cur][habit.id]); dias++; }
    cur = addDays(cur, 1);
  }
  return { media: dias ? soma / dias : 0, dias };
}

// ── Constância: mapa de calor dos últimos N dias ────────────────────────────
export type HeatDay = { data: string; score: number; temRegistro: boolean };

export function heatmap(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  todayISO: string,
  dias = 30,
): HeatDay[] {
  const out: HeatDay[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const data = addDays(todayISO, -i);
    const reg = temRegistro(idx[data]);
    out.push({ data, score: reg ? dayScore(habits, idx[data]) : 0, temRegistro: reg });
  }
  return out;
}

/** Dias seguidos (terminando ontem) com score >= limiar. Não conta hoje, que
 *  ainda está em andamento. */
export function streak(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  todayISO: string,
  limiar = 0.7,
): number {
  let n = 0;
  let cur = addDays(todayISO, -1);
  while (temRegistro(idx[cur]) && dayScore(habits, idx[cur]) >= limiar) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

// ── Evolução inteligente ────────────────────────────────────────────────────
export type Tendencia = "subindo" | "estavel" | "caindo";

function tendenciaDe(atual: number, anterior: number, margem = 0.05): Tendencia {
  const d = atual - anterior;
  if (d > margem) return "subindo";
  if (d < -margem) return "caindo";
  return "estavel";
}

export type Veredito = {
  status: "evoluindo" | "estavel" | "regredindo" | "comecando";
  semanaAtual: number;   // 0..1
  semanaAnterior: number;
};

export function veredito(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  todayISO: string,
): Veredito {
  const atual = avgScore(habits, idx, addDays(todayISO, -6), todayISO);
  const anterior = avgScore(habits, idx, addDays(todayISO, -13), addDays(todayISO, -7));
  if (anterior.dias === 0) {
    return { status: "comecando", semanaAtual: atual.media, semanaAnterior: 0 };
  }
  const t = tendenciaDe(atual.media, anterior.media);
  const status = t === "subindo" ? "evoluindo" : t === "caindo" ? "regredindo" : "estavel";
  return { status, semanaAtual: atual.media, semanaAnterior: anterior.media };
}

export type HabitStat = {
  habit: Habit;
  mediaMes: number;      // 0..1
  tendencia: Tendencia;
  semanaAtual: number;
  semanaAnterior: number;
};

export function habitStats(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  todayISO: string,
): HabitStat[] {
  const ativos = habits.filter((h) => h.ativo);
  return ativos.map((h) => {
    const mes = avgHabit(h, idx, addDays(todayISO, -29), todayISO);
    const sa = avgHabit(h, idx, addDays(todayISO, -6), todayISO);
    const sant = avgHabit(h, idx, addDays(todayISO, -13), addDays(todayISO, -7));
    return {
      habit: h,
      mediaMes: mes.media,
      semanaAtual: sa.media,
      semanaAnterior: sant.media,
      tendencia: sant.dias === 0 ? "estavel" : tendenciaDe(sa.media, sant.media),
    };
  });
}

const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Frases geradas dos próprios números — o "inteligente". */
export function insights(
  habits: Habit[],
  idx: Record<string, Record<string, number>>,
  todayISO: string,
): string[] {
  const out: string[] = [];
  const stats = habitStats(habits, idx, todayISO).filter(
    (s) => avgHabit(s.habit, idx, addDays(todayISO, -29), todayISO).dias >= 3,
  );
  if (stats.length === 0) return out;

  const ordenado = [...stats].sort((a, b) => a.mediaMes - b.mediaMes);
  const pior = ordenado[0];
  const melhor = ordenado[ordenado.length - 1];

  if (pior.mediaMes < 0.7) {
    const cai = pior.tendencia === "caindo" ? " e ainda vem caindo" : "";
    out.push(`${pior.habit.label} é seu ponto fraco: ${pct(pior.mediaMes)}% da meta no mês${cai}.`);
  }
  if (melhor.mediaMes >= 0.85 && melhor.habit.id !== pior.habit.id) {
    out.push(`${melhor.habit.label}: ${pct(melhor.mediaMes)}% — sua maior constância. Segue assim.`);
  }
  // Contraste "manda num, falha noutro"
  if (melhor.mediaMes - pior.mediaMes >= 0.3 && melhor.habit.id !== pior.habit.id) {
    out.push(`Você manda bem em ${melhor.habit.label}, mas ${pior.habit.label} te derruba.`);
  }
  // Evoluindo num hábito por 2+ semanas
  const subindo = stats.find((s) => s.tendencia === "subindo" && s.semanaAtual >= 0.6);
  if (subindo) out.push(`${subindo.habit.label} vem melhorando — continue puxando.`);

  // Padrão por dia da semana (últimos 30 dias)
  const porDow: { soma: number; dias: number }[] = Array.from({ length: 7 }, () => ({ soma: 0, dias: 0 }));
  for (let i = 0; i < 30; i++) {
    const data = addDays(todayISO, -i);
    if (!temRegistro(idx[data])) continue;
    const w = parseISO(data).getDay();
    porDow[w].soma += dayScore(habits, idx[data]);
    porDow[w].dias++;
  }
  const medias = porDow.map((p, w) => ({ w, media: p.dias >= 2 ? p.soma / p.dias : -1 }))
    .filter((m) => m.media >= 0);
  if (medias.length >= 4) {
    const geral = medias.reduce((s, m) => s + m.media, 0) / medias.length;
    const piorDia = [...medias].sort((a, b) => a.media - b.media)[0];
    if (geral - piorDia.media >= 0.15) {
      out.push(`Toda ${DOW[piorDia.w]} sua aderência cai (${pct(piorDia.media)}% vs ${pct(geral)}% nos outros dias). Algo nesse dia?`);
    }
  }

  return out;
}

export function imc(pesoKg: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

export function imcFaixa(valor: number): { label: string; cor: string } {
  if (valor < 18.5) return { label: "abaixo", cor: "text-blue-600" };
  if (valor < 25)   return { label: "normal", cor: "text-emerald-600" };
  if (valor < 30)   return { label: "sobrepeso", cor: "text-amber-600" };
  return { label: "obesidade", cor: "text-red-600" };
}

export function idadeDe(nascimentoISO: string, todayISO: string): number {
  const n = parseISO(nascimentoISO), h = parseISO(todayISO);
  let idade = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) idade--;
  return idade;
}

/** Segunda-feira da semana que contém `iso`. */
export function segundaDaSemana(iso: string): string {
  const d = parseISO(iso);
  const dow = d.getDay(); // 0=Dom, 1=Seg, …, 6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toISO(d);
}

/** "22 a 28/06" ou "27/05 a 02/06" se mudar de mês. */
export function labelSemana(segunda: string): string {
  const seg = parseISO(segunda);
  const dom = parseISO(addDays(segunda, 6));
  const pad = (n: number) => String(n).padStart(2, "0");
  const mes2 = pad(dom.getMonth() + 1);
  if (seg.getMonth() === dom.getMonth()) {
    return `${seg.getDate()} a ${dom.getDate()}/${mes2}`;
  }
  return `${seg.getDate()}/${pad(seg.getMonth() + 1)} a ${dom.getDate()}/${mes2}`;
}
