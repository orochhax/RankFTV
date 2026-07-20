import type { SupabaseClient } from "@supabase/supabase-js";
import { hhmm } from "@/lib/arena-dates";

// Dados financeiros/analíticos agregados da arena — usado por /relatorios
// (faturamento previsto, receita, presença, ranking). Só leitura/agregação;
// nenhuma escrita e nenhum dado que permita cobrar um aluno individualmente
// mora aqui (isso é /arenas/[handle]/financeiro, do próprio aluno).

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type ProfileRow = { id?: string; nome: string; username: string };

export type ArenaFinanceiroData = {
  mesAtual: string;
  faturamentoPrevisto: number;
  numAlunos: number;
  receitaMensal: { label: string; valor: number }[];
  presencasSemanal: { dow: number; label: string; count: number }[];
  classesPorDia: { dow: number; classes: { id: string; titulo: string; horaInicio: string | null; totalPresencas: number }[] }[];
  rankingAlunos: { userId: string; nome: string; username: string; totalAulas: number; trend: "up" | "down" | "same" | "new" }[];
};

export async function getArenaFinanceiroData(
  supabase: SupabaseClient,
  arenaId: string,
): Promise<ArenaFinanceiroData> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const mesAtual = today.slice(0, 7);

  const d6 = new Date();
  d6.setMonth(d6.getMonth() - 5);
  const sixMonthsAgo = `${d6.getFullYear()}-${String(d6.getMonth() + 1).padStart(2, "0")}`;

  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const thirtyDaysAgo = d30.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const d60 = new Date();
  d60.setDate(d60.getDate() - 60);
  const sixtyDaysAgo = d60.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const [alunosRes, chargesRes, attendanceRes, classesRes] = await Promise.all([
    supabase
      .from("arena_students")
      .select("id, user_id, valor_mensalidade, status")
      .eq("arena_id", arenaId)
      .eq("status", "ativo")
      .order("created_at", { ascending: true }),
    supabase
      .from("student_charges")
      .select("competencia, valor")
      .eq("arena_id", arenaId)
      .eq("status_pagamento", "pago")
      .gte("competencia", sixMonthsAgo),
    supabase
      .from("arena_attendance")
      .select("user_id, data, class_id")
      .eq("arena_id", arenaId)
      .gte("data", sixtyDaysAgo),
    supabase
      .from("arena_classes")
      .select("id, titulo, hora_inicio, dias_semana")
      .eq("arena_id", arenaId)
      .eq("ativo", true)
      .order("hora_inicio", { ascending: true }),
  ]);

  const alunosRaw = alunosRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const classes = (classesRes.data ?? []) as { id: string; titulo: string; hora_inicio: string | null; dias_semana: number[] | null }[];

  const userIds = alunosRaw.map((a) => a.user_id as string).filter(Boolean);
  const { data: profilesData } = userIds.length
    ? await supabase.from("profiles").select("id, nome, username").in("id", userIds)
    : { data: [] as ProfileRow[] };
  const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p as ProfileRow]));

  const alunos = alunosRaw.map((a) => ({
    ...a,
    profiles: profileMap.get(a.user_id as string) ?? null,
  }));

  const faturamentoPrevisto = alunos.reduce(
    (s, a) => s + (a.valor_mensalidade ? Number(a.valor_mensalidade) : 0), 0,
  );

  const mesLabels: string[] = [];
  const mesKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    mesKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    mesLabels.push(MESES_PT[d.getMonth()]);
  }
  const mesValores = new Map(mesKeys.map((k) => [k, 0]));
  for (const c of chargesRes.data ?? []) {
    if (mesValores.has(c.competencia)) {
      mesValores.set(c.competencia, (mesValores.get(c.competencia) ?? 0) + Number(c.valor ?? 0));
    }
  }
  const receitaMensal = mesKeys.map((k, i) => ({ label: mesLabels[i], valor: mesValores.get(k) ?? 0 }));

  const att30 = attendance.filter((a) => a.data >= thirtyDaysAgo);
  const attPrev = attendance.filter((a) => a.data < thirtyDaysAgo);

  const dowUsers = new Map<number, Set<string>>();
  for (const a of att30) {
    const dow = new Date(a.data + "T12:00:00").getDay();
    if (!dowUsers.has(dow)) dowUsers.set(dow, new Set());
    dowUsers.get(dow)!.add(a.user_id);
  }
  const presencasSemanal = Array.from({ length: 7 }, (_, dow) => ({
    dow,
    label: DIAS_PT[dow],
    count: dowUsers.get(dow)?.size ?? 0,
  }));

  const classesPorDia = Array.from({ length: 7 }, (_, dow) => {
    const classesDay = classes.filter((c) => (c.dias_semana ?? []).includes(dow));
    return {
      dow,
      classes: classesDay.map((cl) => ({
        id: cl.id,
        titulo: cl.titulo,
        horaInicio: hhmm(cl.hora_inicio),
        totalPresencas: att30.filter((a) => a.class_id === cl.id).length,
      })),
    };
  });

  const countCurrent = new Map<string, number>();
  const countPrev = new Map<string, number>();
  for (const a of att30) countCurrent.set(a.user_id, (countCurrent.get(a.user_id) ?? 0) + 1);
  for (const a of attPrev) countPrev.set(a.user_id, (countPrev.get(a.user_id) ?? 0) + 1);

  const rankCurrent = new Map(
    [...countCurrent.entries()].sort((a, b) => b[1] - a[1]).map(([uid], i) => [uid, i + 1]),
  );
  const rankPrev = new Map(
    [...countPrev.entries()].sort((a, b) => b[1] - a[1]).map(([uid], i) => [uid, i + 1]),
  );

  const rankingAlunos = alunos
    .map((a) => {
      const p = a.profiles;
      const uid = a.user_id as string;
      const total = countCurrent.get(uid) ?? 0;
      const rAtual = rankCurrent.get(uid);
      const rAnterior = rankPrev.get(uid);
      let trend: "up" | "down" | "same" | "new" = "new";
      if (rAtual !== undefined && rAnterior !== undefined) {
        if (rAtual < rAnterior) trend = "up";
        else if (rAtual > rAnterior) trend = "down";
        else trend = "same";
      }
      return { userId: uid, nome: p?.nome ?? "—", username: p?.username ?? "", totalAulas: total, trend };
    })
    .sort((a, b) => b.totalAulas - a.totalAulas);

  return {
    mesAtual,
    faturamentoPrevisto,
    numAlunos: alunos.length,
    receitaMensal,
    presencasSemanal,
    classesPorDia,
    rankingAlunos,
  };
}
