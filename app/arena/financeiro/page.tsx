import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroArenaClient } from "@/components/arena/FinanceiroArenaClient";

export default async function FinanceiroArenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome")
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) redirect("/perfil/ativar-arena");

  // Alunos ativos com suas cobranças do mês atual
  const mesAtual = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const { data: alunos } = await supabase
    .from("arena_students")
    .select("id, valor_mensalidade, profiles(nome, username)")
    .eq("arena_id", arena.id)
    .eq("status", "ativo")
    .order("created_at", { ascending: true });

  const alunoIds = (alunos ?? []).map((a) => a.id);
  const { data: cobMes } = alunoIds.length > 0
    ? await supabase
        .from("student_charges")
        .select("id, arena_student_id, competencia, valor, status_pagamento")
        .eq("arena_id", arena.id)
        .eq("competencia", mesAtual)
        .in("arena_student_id", alunoIds)
    : { data: [] };

  const cobMap = Object.fromEntries((cobMes ?? []).map((c) => [c.arena_student_id, c]));

  type ProfileRow = { nome: string; username: string };

  const alunosComSituacao = (alunos ?? []).map((a) => {
    const p = Array.isArray(a.profiles) ? a.profiles[0] as ProfileRow : a.profiles as ProfileRow;
    const cob = cobMap[a.id];
    return {
      id:              a.id,
      nome:            p?.nome ?? "—",
      username:        p?.username ?? "",
      valorMensalidade: a.valor_mensalidade ? Number(a.valor_mensalidade) : null,
      cobranca: cob ? {
        id:              cob.id,
        status:          cob.status_pagamento,
        competencia:     cob.competencia,
      } : null,
    };
  });

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <DollarSign className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          </div>
          <p className="text-sm text-white/50">
            Gerencie mensalidades dos alunos. Competência: {mesAtual.slice(5)}/{mesAtual.slice(0,4)}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          <FinanceiroArenaClient
            alunos={alunosComSituacao}
            mesAtual={mesAtual}
          />
        </div>
      </div>
    </div>
  );
}
