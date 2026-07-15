import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plus,
  FileText,
  TrendingUp,
  Trophy,
  Users,
  Banknote,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { PainelLandingClient } from "@/components/painel/PainelLandingClient";
import { PageContainer } from "@/components/shell/PageContainer";
import { StatCard } from "@/components/shell/StatCard";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtMedia(v: number) {
  return `~R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PainelOrganizadorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isOrganizer = false;
  let todos: Awaited<ReturnType<typeof getMyChampionships>> = [];
  let arenaCount = 0;
  if (user) {
    const [orgRes, champs, arenaRes] = await Promise.all([
      supabase.from("organizer_accounts").select("id").eq("user_id", user.id).maybeSingle(),
      getMyChampionships(user.id),
      supabase.from("arenas").select("id", { count: "exact", head: true }).eq("dono_id", user.id),
    ]);
    isOrganizer = !!orgRes.data;
    todos = champs;
    arenaCount = arenaRes.count ?? 0;
  }

  if (user && (isOrganizer || todos.length > 0)) {
    const abertos         = todos.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento");
    const campsAbertos    = todos.filter((c) => c.status === "inscricoes_abertas").length;
    const campsAndamento  = todos.filter((c) => c.status === "em_andamento").length;
    const campsEncerrados = todos.filter((c) => c.status === "encerrado").length;

    const champIds = todos.map((c) => c.id);

    // Busca arenas do organizador
    const { data: arenaRows } = await supabase
      .from("arenas")
      .select("id")
      .eq("dono_id", user.id);
    const arenaIds = (arenaRows ?? []).map((a) => a.id);

    // Datas do mês corrente
    const hoje     = new Date();
    const inicioMs = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
    const fimMs    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split("T")[0];

    // Busca todos os dados financeiros em paralelo
    const [
      regsData,
      ticketsData,
      studentsData,
      rentalsData,
      dailiesData,
      chargesData,
    ] = await Promise.all([
      champIds.length > 0
        ? supabase.from("registrations").select("valor, status_pagamento").in("championship_id", champIds)
        : Promise.resolve({ data: [] as { valor: number; status_pagamento: string }[] }),
      champIds.length > 0
        ? supabase.from("spectator_tickets").select("valor, status_pagamento, quantidade").in("championship_id", champIds)
        : Promise.resolve({ data: [] as { valor: number; status_pagamento: string; quantidade: number | null }[] }),
      arenaIds.length > 0
        ? supabase.from("arena_students").select("valor_mensalidade, status").in("arena_id", arenaIds)
        : Promise.resolve({ data: [] as { valor_mensalidade: number | null; status: string }[] }),
      arenaIds.length > 0
        ? supabase.from("arena_rentals").select("valor, status_pagamento, data").in("arena_id", arenaIds)
        : Promise.resolve({ data: [] as { valor: number; status_pagamento: string; data: string }[] }),
      arenaIds.length > 0
        ? supabase.from("arena_daily_passes").select("valor, status_pagamento, data").in("arena_id", arenaIds)
        : Promise.resolve({ data: [] as { valor: number; status_pagamento: string; data: string }[] }),
      arenaIds.length > 0
        ? supabase.from("student_charges").select("valor, status_pagamento").in("arena_id", arenaIds)
        : Promise.resolve({ data: [] as { valor: number; status_pagamento: string }[] }),
    ]);

    // ── Campeonatos ──
    const regs           = regsData.data ?? [];
    const regsPagas      = regs.filter((r) => r.status_pagamento === "pago");
    const regsPendente   = regs.filter((r) => r.status_pagamento === "pendente");
    const regsEstornado  = regs.filter((r) => r.status_pagamento === "estornado");
    const totalAtletas   = regsPagas.reduce((s, r) => s + Number(r.valor), 0);
    const totalPendente  = regsPendente.reduce((s, r) => s + Number(r.valor), 0);
    const totalEstornado = regsEstornado.reduce((s, r) => s + Number(r.valor), 0);
    const ticketAtletas  = regsPagas.length > 0 ? totalAtletas / regsPagas.length : 0;

    // ── Plateia ──
    const tickets        = ticketsData.data ?? [];
    const ticketsPagos   = tickets.filter((t) => t.status_pagamento === "pago");
    const totalPlateia   = ticketsPagos.reduce((s, t) => s + Number(t.valor), 0);
    const qtdIngressos   = ticketsPagos.reduce((s, t) => s + Number(t.quantidade ?? 1), 0);
    const ticketPlateia  = qtdIngressos > 0 ? totalPlateia / qtdIngressos : 0;

    // ── Saldo de Campeonatos (card 3) ──
    const saldoCampeonatos = totalAtletas + totalPlateia;

    // ── Arena ──
    const students       = studentsData.data ?? [];
    const alunosAtivos   = students.filter((s) => s.status === "ativo");
    const totalMRR       = alunosAtivos.reduce((s, a) => s + Number(a.valor_mensalidade ?? 0), 0);

    const rentals        = rentalsData.data ?? [];
    const rentaisMes     = rentals.filter((r) => r.status_pagamento === "pago" && r.data >= inicioMs && r.data <= fimMs);
    const totalAluguelMs = rentaisMes.reduce((s, r) => s + Number(r.valor), 0);

    const dailies        = dailiesData.data ?? [];
    const diariasMes     = dailies.filter((d) => d.status_pagamento === "pago" && d.data >= inicioMs && d.data <= fimMs);
    const totalDiariasMs = diariasMes.reduce((s, d) => s + Number(d.valor), 0);

    // ── Saldo da Arena (card 4) ──
    const saldoArena = totalMRR + totalAluguelMs + totalDiariasMs;

    // ── Receita total consolidada ──
    const charges         = chargesData.data ?? [];
    const chargesPagas    = charges.filter((c) => c.status_pagamento === "pago");
    const totalCharges    = chargesPagas.reduce((s, c) => s + Number(c.valor), 0);
    const totalAluguelAll = rentals.filter((r) => r.status_pagamento === "pago").reduce((s, r) => s + Number(r.valor), 0);
    const totalDiariasAll = dailies.filter((d) => d.status_pagamento === "pago").reduce((s, d) => s + Number(d.valor), 0);
    const receitaTotal    = totalAtletas + totalPlateia + totalCharges + totalAluguelAll + totalDiariasAll;

    // suppress unused-var warnings for pending/estornado (kept for future use)
    void totalPendente;
    void totalEstornado;

    const acoesCriacao = (
      <>
        <Link
          href="/perfil/ativar-arena"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 md:border-0 md:bg-white/10 md:text-white/80 md:hover:bg-white/15"
        >
          <Plus className="size-4" /> Cadastrar arena
        </Link>
        <Link
          href="/painel/novo-campeonato"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <Plus className="size-4" /> Criar campeonato
        </Link>
      </>
    );

    return (
      <div className="min-h-screen">
        <AutoRefresh intervalMs={60_000} />

        {/* ── Cabeçalho: faixa escura no mobile, claro + StatCards no desktop ── */}
        <div className="bg-[#0f0f13] px-6 pb-16 pt-8 md:hidden">
          <div className="mx-auto max-w-4xl space-y-5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel do organizador</h1>
            <div className="flex items-center gap-2">{acoesCriacao}</div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Campeonatos</p>
                <p className="text-2xl font-bold text-white">{todos.length}</p>
                <p className="mt-1 text-[11px] text-white/40">{abertos.length} abertos</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Arenas</p>
                <p className="text-2xl font-bold text-white">{arenaCount}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {arenaCount === 0 ? "nenhuma ainda" : arenaCount === 1 ? "ativa" : "ativas"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Saldo de Campeonatos</p>
                <p className="text-xl font-bold text-white">{fmt(saldoCampeonatos)}</p>
                <p className="mt-1 text-[11px] text-white/40">atletas + plateia</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Saldo da Arena</p>
                <p className="text-xl font-bold text-white">{fmt(saldoArena)}</p>
                <p className="mt-1 text-[11px] text-white/40">MRR + aluguéis + diárias</p>
              </div>
            </div>

            {/* Atalhos */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                href="/arena"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white">Minhas Arenas</p>
                    <p className="text-xs text-white/40">Alunos, presenças e mensalidades</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
              <Link
                href="/painel/campeonatos"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="size-5 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">Meus Campeonatos</p>
                    <p className="text-xs text-white/40">Categorias, inscrições e resultados</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden border-b border-border bg-surface md:block">
          <PageContainer width="wide" className="space-y-6 py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">Painel do organizador</h1>
              <div className="flex items-center gap-2">{acoesCriacao}</div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Campeonatos" value={todos.length} hint={`${abertos.length} abertos`} icon={Trophy} />
              <StatCard
                label="Arenas"
                value={arenaCount}
                hint={arenaCount === 0 ? "nenhuma ainda" : arenaCount === 1 ? "ativa" : "ativas"}
                icon={Building2}
              />
              <StatCard label="Saldo de Campeonatos" value={fmt(saldoCampeonatos)} hint="atletas + plateia" tone="success" />
              <StatCard label="Saldo da Arena" value={fmt(saldoArena)} hint="MRR + aluguéis + diárias" tone="success" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/arena"
                className="flex items-center justify-between rounded-card-lg bg-surface-2 px-5 py-4 ring-1 ring-border transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-ink">Minhas Arenas</p>
                    <p className="text-xs text-ink-muted">Alunos, presenças e mensalidades</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-ink-muted" />
              </Link>
              <Link
                href="/painel/campeonatos"
                className="flex items-center justify-between rounded-card-lg bg-surface-2 px-5 py-4 ring-1 ring-border transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="size-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-ink">Meus Campeonatos</p>
                    <p className="text-xs text-ink-muted">Categorias, inscrições e resultados</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-ink-muted" />
              </Link>
            </div>
          </PageContainer>
        </div>

        {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
          <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />
          <PageContainer width="form" className="space-y-8">

            {/* Receita total consolidada */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Receita total consolidada</p>
              <p className="mt-2 text-3xl font-bold text-white">{fmt(receitaTotal)}</p>
              <p className="mt-1 text-xs text-blue-200/70">
                atletas + plateia + mensalidades + aluguéis + diárias (tudo recebido)
              </p>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Status dos campeonatos */}
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status dos campeonatos</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { valor: campsAbertos,    label: "Inscrições abertas" },
                    { valor: campsAndamento,  label: "Em andamento" },
                    { valor: campsEncerrados, label: "Encerrados" },
                  ].map(({ valor, label }) => (
                    <div
                      key={label}
                      className={`rounded-2xl p-4 ring-1 text-center ${
                        valor > 0
                          ? "bg-blue-50 ring-blue-100"
                          : "bg-gray-50 ring-gray-100"
                      }`}
                    >
                      <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-gray-400"}`}>
                        {valor}
                      </p>
                      <p className={`mt-1 text-xs ${valor > 0 ? "text-blue-600" : "text-gray-400"}`}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Status da arena */}
              {arenaIds.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status da arena</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { valor: alunosAtivos.length, label: "Alunos mensalistas" },
                      { valor: rentaisMes.length,   label: "Aluguéis no mês" },
                      { valor: diariasMes.length,   label: "Diárias no mês" },
                    ].map(({ valor, label }) => (
                      <div
                        key={label}
                        className={`rounded-2xl p-4 ring-1 text-center ${
                          valor > 0
                            ? "bg-blue-50 ring-blue-100"
                            : "bg-gray-50 ring-gray-100"
                        }`}
                      >
                        <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-gray-400"}`}>
                          {valor}
                        </p>
                        <p className={`mt-1 text-xs ${valor > 0 ? "text-blue-600" : "text-gray-400"}`}>
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Financeiro por Categoria */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Financeiro por categoria</h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {/* Saldo de atletas */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-700">Saldo de atletas</p>
                      {regsPagas.length > 0 && (
                        <p className="text-xs text-gray-400">média {fmtMedia(ticketAtletas)} / dupla</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{fmt(totalAtletas)}</p>
                </div>
                {/* Saldo de plateia */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-700">Saldo de plateia</p>
                      <p className="text-xs text-gray-400">
                        {qtdIngressos > 0 ? `média ${fmtMedia(ticketPlateia)} / ingresso` : "sem ingressos pagos"}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{fmt(totalPlateia)}</p>
                </div>
                {/* MRR */}
                {arenaIds.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Banknote className="size-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-700">MRR (mensalidades ativas)</p>
                        <p className="text-xs text-gray-400">
                          {alunosAtivos.length > 0
                            ? `média ${fmtMedia(totalMRR / alunosAtivos.length)} / aluno`
                            : "sem alunos ativos"}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{fmt(totalMRR)}</p>
                  </div>
                )}
                {/* Aluguéis + Diárias do mês */}
                {arenaIds.length > 0 && (totalAluguelMs > 0 || totalDiariasMs > 0) && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="size-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-700">Aluguéis + diárias (mês)</p>
                        <p className="text-xs text-gray-400">
                          {rentaisMes.length} alug. · {diariasMes.length} diárias
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{fmt(totalAluguelMs + totalDiariasMs)}</p>
                  </div>
                )}
              </div>
            </section>

            <Link
              href="/termos"
              className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
            >
              <FileText className="size-5 shrink-0 text-gray-400" />
              <span className="flex-1 text-sm font-medium text-gray-700">Termos de uso</span>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
            </Link>
          </PageContainer>
        </div>
      </div>
    );
  }

  // Landing page de conversão (não logado ou sem conta de organizador)
  return <PainelLandingClient isLoggedIn={!!user} />;
}
