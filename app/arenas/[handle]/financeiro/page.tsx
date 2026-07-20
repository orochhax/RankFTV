import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroAlunoClient } from "@/components/arena/FinanceiroAlunoClient";
import {
  mensalidadeParaHistorico, aulaAvulsaParaHistorico, ordenarHistoricoCobrancas,
} from "@/lib/arena-cobranca";

export default async function FinanceiroAlunoPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arenas/${handle}/financeiro`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .maybeSingle();
  if (!arena) notFound();

  // Confirma associação/autorização no servidor: só aluno ativo desta arena
  // vê o próprio cartão e histórico — nunca dados de outro aluno.
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("id")
    .eq("arena_id", arena.id)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (!vinculo) redirect(`/arenas/${handle}`);

  const [{ data: cartao }, { data: mensalidades }, { data: avulsas }] = await Promise.all([
    supabase
      .from("arena_student_cards")
      .select("brand, last4, exp_month, exp_year")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("student_charges")
      .select("id, competencia, valor, status_pagamento")
      .eq("arena_student_id", vinculo.id)
      .order("competencia", { ascending: false }),
    supabase
      .from("arena_attendance")
      .select("id, data, pagamento_status, pagamento_erro, valor_avulso, arena_classes(titulo)")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .eq("tipo_cobranca", "avulsa")
      .neq("pagamento_status", "nao_aplicavel")
      .order("data", { ascending: false }),
  ]);

  type ClasseRel = { titulo: string };
  function classeDe(raw: unknown): ClasseRel | null {
    if (!raw) return null;
    return Array.isArray(raw) ? (raw[0] as ClasseRel) ?? null : (raw as ClasseRel);
  }

  const historico = ordenarHistoricoCobrancas([
    ...(mensalidades ?? []).map((m) => mensalidadeParaHistorico(m)),
    ...(avulsas ?? []).map((a) => aulaAvulsaParaHistorico({
      id: a.id,
      data: a.data,
      titulo: classeDe(a.arena_classes)?.titulo ?? "Aula",
      valor_avulso: a.valor_avulso != null ? Number(a.valor_avulso) : null,
      pagamento_status: a.pagamento_status,
    })),
  ]);

  const cobrancasComRetry = (avulsas ?? [])
    .filter((a) => a.pagamento_status === "falhou")
    .map((a) => a.id);

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href={`/arenas/${arena.handle}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Wallet className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Financeiro</h1>
          </div>
          <p className="text-sm text-white/40">Cartão padrão e histórico de cobranças nesta arena.</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <FinanceiroAlunoClient
            arenaId={arena.id}
            handle={arena.handle}
            cartao={cartao ?? null}
            historico={historico}
            cobrancasComRetry={cobrancasComRetry}
          />
        </div>
      </div>
    </div>
  );
}
