import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRadarEvasaoReport,
  shiftDaysISO,
  type RadarEvasaoReport,
  type RadarStudentInput,
} from "./arena-radar-evasao-core";

export {
  buildRadarEvasaoReport,
  type RadarAlunoAlerta,
  type RadarAttendanceInput,
  type RadarChargeInput,
  type RadarEvasaoReport,
  type RadarStudentInput,
  type RiscoEvasao,
} from "./arena-radar-evasao-core";

export async function getArenaRadarEvasao(
  supabase: SupabaseClient,
  arenaId: string,
  arenaNome: string,
): Promise<RadarEvasaoReport> {
  const todayISO = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const cutoff120 = shiftDaysISO(todayISO, -120);
  const admin = createAdminClient();

  const [studentsRes, plansRes, attendanceRes, chargesRes] = await Promise.all([
    supabase
      .from("arena_students")
      .select("user_id, data_entrada, valor_mensalidade, plan_id")
      .eq("arena_id", arenaId)
      .eq("status", "ativo")
      .limit(500),
    supabase
      .from("arena_plans")
      .select("id, nome, valor")
      .eq("arena_id", arenaId),
    supabase
      .from("arena_attendance")
      .select("user_id, data, status")
      .eq("arena_id", arenaId)
      .gte("data", cutoff120)
      .limit(5000),
    supabase
      .from("student_charges")
      .select("user_id, status_pagamento, competencia, valor")
      .eq("arena_id", arenaId)
      .eq("status_pagamento", "pendente")
      .limit(1000),
  ]);

  const rawStudents = studentsRes.data ?? [];
  const userIds = rawStudents.map((s) => s.user_id as string).filter(Boolean);
  const planMap = new Map(
    (plansRes.data ?? []).map((p) => [p.id as string, { nome: String(p.nome), valor: Number(p.valor ?? 0) }]),
  );

  const [profilesRes, privRes] = userIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, nome, username").in("id", userIds),
        admin.from("profiles_private").select("user_id, telefone").in("user_id", userIds),
      ])
    : [{ data: [] as Array<{ id: string; nome: string; username: string }> }, { data: [] as Array<{ user_id: string; telefone: string | null }> }];

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const phoneMap = new Map((privRes.data ?? []).map((p) => [p.user_id, p.telefone ?? null]));

  const students: RadarStudentInput[] = rawStudents.map((row) => {
    const uid = row.user_id as string;
    const prof = profileMap.get(uid);
    const planInfo = row.plan_id ? planMap.get(row.plan_id as string) : undefined;
    const mensalidade =
      row.valor_mensalidade != null
        ? Number(row.valor_mensalidade)
        : (planInfo?.valor ?? 0);
    return {
      userId: uid,
      nome: prof?.nome ?? "Aluno",
      username: prof?.username ?? "",
      telefone: phoneMap.get(uid) ?? null,
      dataEntrada: (row.data_entrada as string | null) ?? null,
      valorMensalidade: mensalidade,
      planoNome: planInfo?.nome ?? null,
    };
  });

  return buildRadarEvasaoReport({
    arenaNome,
    students,
    attendance: (attendanceRes.data ?? []).map((a) => ({
      userId: a.user_id as string,
      data: a.data as string,
      status: a.status as string,
    })),
    charges: (chargesRes.data ?? []).map((c) => ({
      userId: c.user_id as string,
      statusPagamento: c.status_pagamento as string,
      competencia: c.competencia as string,
      valor: Number(c.valor ?? 0),
    })),
    todayISO,
  });
}
