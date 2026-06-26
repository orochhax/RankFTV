import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroDashboard } from "@/components/arena/FinanceiroDashboard";
import { FinanceiroArenaClient } from "@/components/arena/FinanceiroArenaClient";

type ProfileRow = { id?: string; nome: string; username: string };
function perfil(raw: ProfileRow | null | undefined): ProfileRow | null {
  return raw ?? null;
}

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function FinanceiroArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("dono_id", user.id);

  if (handle) query = query.eq("handle", handle);
  else query = query.order("created_at", { ascending: true });

  const { data: arena } = await query.maybeSingle();

  if (!arena) redirect("/perfil/ativar-arena");

  // Datas de referência (Brasil)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const mesAtual = today.slice(0, 7); // "YYYY-MM"

  const d6 = new Date();
  d6.setMonth(d6.getMonth() - 5);
  const sixMonthsAgo = `${d6.getFullYear()}-${String(d6.getMonth() + 1).padStart(2, "0")}`;

  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const thirtyDaysAgo = d30.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const d60 = new Date();
  d60.setDate(d60.getDate() - 60);
  const sixtyDaysAgo = d60.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  // Todas as queries em paralelo
  const [alunosRes, cobMesRes, chargesRes, attendanceRes, classesRes] = await Promise.all([
    supabase
      .from("arena_students")
      .select("id, user_id, valor_mensalidade, status")
      .eq("arena_id", arena.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: true }),
    supabase
      .from("student_charges")
      .select("id, arena_student_id, competencia, valor, status_pagamento")
      .eq("arena_id", arena.id)
      .eq("competencia", mesAtual),
    supabase
      .from("student_charges")
      .select("competencia, valor")
      .eq("arena_id", arena.id)
      .eq("status_pagamento", "pago")
      .gte("competencia", sixMonthsAgo),
    supabase
      .from("arena_attendance")
      .select("user_id, data, class_id")
      .eq("arena_id", arena.id)
      .gte("data", sixtyDaysAgo),
    supabase
      .from("arena_classes")
      .select("id, titulo, horario, dias_semana")
      .eq("arena_id", arena.id)
      .eq("ativo", true)
      .order("horario", { ascending: true }),
  ]);

  const alunosRaw  = alunosRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const classes    = (classesRes.data ?? []) as { id: string; titulo: string; horario: string | null; dias_semana: number[] | null }[];

  // Busca profiles dos alunos separadamente (FK de arena_students aponta para auth.users, não profiles)
  const userIds = alunosRaw.map((a) => a.user_id as string).filter(Boolean);
  const { data: profilesData } = userIds.length
    ? await supabase.from("profiles").select("id, nome, username").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

  const alunos = alunosRaw.map((a) => ({
    ...a,
    profiles: profileMap.get(a.user_id as string) ?? null,
  }));

  // ── Faturamento previsto ──
  const faturamentoPrevisto = alunos.reduce(
    (s, a) => s + (a.valor_mensalidade ? Number(a.valor_mensalidade) : 0), 0,
  );

  // ── Gráfico mensal (últimos 6 meses) ──
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

  // ── Gráfico semanal (últimos 30 dias) ──
  const att30 = attendance.filter((a) => a.data >= thirtyDaysAgo);
  const attPrev = attendance.filter((a) => a.data < thirtyDaysAgo); // 30–60 dias atrás

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

  // ── Breakdown por dia (clique no gráfico semanal) ──
  const classesPorDia = Array.from({ length: 7 }, (_, dow) => {
    const classesDay = classes.filter((c) => (c.dias_semana ?? []).includes(dow));
    return {
      dow,
      classes: classesDay.map((cl) => ({
        id: cl.id,
        titulo: cl.titulo,
        horario: cl.horario,
        totalPresencas: att30.filter((a) => a.class_id === cl.id).length,
      })),
    };
  });

  // ── Ranking de alunos por presença ──
  const countCurrent = new Map<string, number>();
  const countPrev    = new Map<string, number>();
  for (const a of att30)    countCurrent.set(a.user_id, (countCurrent.get(a.user_id) ?? 0) + 1);
  for (const a of attPrev)  countPrev.set(a.user_id,    (countPrev.get(a.user_id)    ?? 0) + 1);

  const rankCurrent = new Map(
    [...countCurrent.entries()].sort((a, b) => b[1] - a[1]).map(([uid], i) => [uid, i + 1]),
  );
  const rankPrev = new Map(
    [...countPrev.entries()].sort((a, b) => b[1] - a[1]).map(([uid], i) => [uid, i + 1]),
  );

  const rankingAlunos = alunos
    .map((a) => {
      const p = perfil(a.profiles);
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

  // ── Dados para o gerenciador de mensalidades (componente existente) ──
  const cobMap = Object.fromEntries((cobMesRes.data ?? []).map((c) => [c.arena_student_id, c]));
  const alunosComSituacao = alunos.map((a) => {
    const p = perfil(a.profiles);
    const cob = cobMap[a.id];
    return {
      id: a.id,
      nome: p?.nome ?? "—",
      username: p?.username ?? "",
      valorMensalidade: a.valor_mensalidade ? Number(a.valor_mensalidade) : null,
      cobranca: cob ? { id: cob.id, status: cob.status_pagamento, competencia: cob.competencia } : null,
    };
  });

  const backHref = arena.handle ? `/arena/${arena.handle}` : "/arena";

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <DollarSign className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          </div>
          <p className="text-sm text-white/50">
            Competência: {mesAtual.slice(5)}/{mesAtual.slice(0, 4)}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-6">

          {/* Dashboard de analytics */}
          <FinanceiroDashboard
            faturamentoPrevisto={faturamentoPrevisto}
            numAlunos={alunos.length}
            receitaMensal={receitaMensal}
            presencasSemanal={presencasSemanal}
            classesPorDia={classesPorDia}
            rankingAlunos={rankingAlunos}
          />

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cobranças do mês
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {/* Gerenciamento de mensalidades (existente) */}
          <FinanceiroArenaClient alunos={alunosComSituacao} mesAtual={mesAtual} />

        </div>
      </div>
    </div>
  );
}
