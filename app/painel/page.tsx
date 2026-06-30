import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  ChevronRight,
  CheckCircle2,
  LayoutDashboard,
  Plus,
  QrCode,
  Wallet,
  Network,
  Sparkles,
  ShieldCheck,
  Shirt,
  Megaphone,
  MessageSquare,
  ClipboardList,
  UserX,
  FileText,
  Tag,
  TrendingUp,
  Trophy,
  Users,
  Banknote,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { AutoRefresh } from "@/components/ui/AutoRefresh";

const DORES = [
  { icon: MessageSquare, texto: "Perseguir no WhatsApp quem ainda não pagou" },
  { icon: ClipboardList, texto: "Planilha pra controlar quem se inscreveu e confirmou" },
  { icon: UserX,         texto: "Fila e confusão na portaria no dia do evento" },
];

const FEATURES = [
  {
    icon: QrCode,
    titulo: "Check-in",
    descricao:
      "Cada atleta recebe a credencial no celular. Check-in por QR em segundos e controle de no-show automático.",
  },
  {
    icon: Wallet,
    titulo: "Financeiro",
    descricao:
      "Cada inscrição entra confirmada e paga. O Pix cai no mesmo dia e você acompanha em tempo real quanto já é seu.",
  },
  {
    icon: Network,
    titulo: "Chaveamento",
    descricao:
      "A chave e os resultados aparecem em tempo real pra atletas e público acompanharem do celular.",
  },
  {
    icon: Megaphone,
    titulo: "Aviso com um clique",
    descricao:
      "Mudança de horário, resultado, informação do local — comunique todos os inscritos de uma vez.",
  },
  {
    icon: Shirt,
    titulo: "Camisas certas",
    descricao:
      "Painel de produção por tamanho: saiba exatamente quantas P, M, G e GG encomendar antes do evento.",
  },
];

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    return (
      <div className="min-h-screen">
        <AutoRefresh intervalMs={60_000} />
        {/* ── Cabeçalho preto ── */}
        <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
          <div className="mx-auto max-w-4xl space-y-5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel do organizador</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/perfil/ativar-arena"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/15 transition-colors"
              >
                <Plus className="size-4" /> Cadastrar arena
              </Link>
              <Link
                href="/painel/novo-campeonato"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus className="size-4" /> Criar campeonato
              </Link>
            </div>

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
              <div className="rounded-2xl bg-blue-500/20 p-4">
                <p className="text-xs text-blue-400">Saldo de Campeonatos</p>
                <p className="text-xl font-bold text-blue-300">{fmt(saldoCampeonatos)}</p>
                <p className="mt-1 text-[11px] text-blue-400/60">atletas + plateia</p>
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
              <Link
                href="/painel/geral"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="size-5 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white">Relatório detalhado</p>
                    <p className="text-xs text-white/40">Financeiro por período</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Seção branca — Painel Geral ── */}
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
          <div className="mx-auto max-w-4xl space-y-8">

            {/* Receita total consolidada */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Receita total consolidada</p>
              <p className="mt-2 text-3xl font-bold text-white">{fmt(receitaTotal)}</p>
              <p className="mt-1 text-xs text-blue-200/70">
                atletas + plateia + mensalidades + aluguéis + diárias (tudo recebido)
              </p>
            </section>

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
                        <p className="text-xs text-gray-400">média {fmt(ticketAtletas)} / dupla</p>
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
                        {qtdIngressos > 0 ? `média ${fmt(ticketPlateia)} / ingresso` : "sem ingressos pagos"}
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
                            ? `média ${fmt(totalMRR / alunosAtivos.length)} / aluno`
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
          </div>
        </div>
      </div>
    );
  }

  // Landing page de conversão (não logado ou sem conta de organizador)
  const cta = user
    ? { href: "/painel/novo-campeonato", label: "Criar meu evento grátis" }
    : { href: "/cadastro", label: "Criar minha conta" };

  return (
    <div className="min-h-screen">
      {/* Hero preto */}
      <div className="bg-[#0f0f13] px-6 pb-20 pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
            Para organizadores
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Seu campeonato sem planilha,
            <br className="hidden sm:block" />{" "}
            sem perseguir pagamento.
          </h1>
          <p className="mt-4 text-lg text-white/60">
            A plataforma cuida da inscrição, do pagamento e do credenciamento.
            Você cuida do jogo.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={cta.href}
              className="w-full rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 sm:w-auto"
            >
              {cta.label}
            </Link>
            {!user && (
              <Link
                href="/login"
                className="w-full rounded-2xl bg-white/10 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 sm:w-auto"
              >
                Já tenho conta — entrar
              </Link>
            )}
          </div>

          <p className="mt-4 text-xs text-white/30">
            Sem custo pra começar · Sem mensalidade
          </p>
        </div>
      </div>

      {/* Conteúdo branco */}
      <div className="relative -mt-6 overflow-hidden rounded-t-3xl bg-white pb-24 pt-10 shadow-sm">

        <div className="mx-auto max-w-3xl space-y-12 px-6">

          {/* Card Nova Geração */}
          <section>
            <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0f] px-7 pb-8 pt-7 text-white">
              <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-blue-600/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-blue-500/10 blur-2xl" />
              <span className="inline-block rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
                Comunidade
              </span>
              <p className="mt-4 text-sm font-medium uppercase tracking-widest text-white/40">
                A sua conexão com a
              </p>
              <h2 className="text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">
                Nova<br />
                <span className="text-blue-400">Geração</span>
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-white/60">
                Atletas, plateias e organizadores — toda a comunidade do futevôlei em um único lugar.
              </p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold text-white">Aumente suas vendas</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                  A experiência digital do seu público é essencial para mostrar que seu evento não é mais qualquer um.
                </p>
              </div>
            </div>
          </section>

          {/* Você conhece isso? */}
          <section>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              Você conhece isso?
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {DORES.map(({ icon: Icon, texto }) => (
                <div key={texto} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                  <Icon className="size-5 shrink-0 text-gray-400" strokeWidth={1.8} />
                  <p className="text-sm text-gray-600">{texto}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-base font-medium text-gray-900">
              Tudo isso vira automático. Veja como 👇
            </p>
          </section>

          {/* Diferencial */}
          <section>
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-7 text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="size-3.5" /> Exclusivo
              </span>
              <h2 className="mt-3 text-2xl font-bold">Categoria balanceada</h2>
              <p className="mt-2 max-w-xl text-blue-50/90">
                A plataforma indica a categoria certa pra cada dupla com base no
                histórico e no nível dos atletas. Menos dupla forte jogando em
                categoria fraca, chave mais justa e atleta mais satisfeito.
              </p>
              <Link
                href={cta.href}
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                {cta.label}
              </Link>
            </div>
          </section>

          {/* Features operacionais */}
          <section>
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              E o resto da operação, redonda
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, titulo, descricao }) => (
                <div key={titulo} className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600">
                    <Icon className="size-5 text-white" strokeWidth={1.8} />
                  </div>
                  <p className="font-semibold text-gray-900">{titulo}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{descricao}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Foto do evento */}
          <section>
            <div className="relative h-52 w-full overflow-hidden rounded-3xl sm:h-64">
              <Image
                src="/images/evento-painel.jpg"
                alt="Evento de futevôlei"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Seu Evento Completo
                </p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  A plataforma completa para o futevôlei
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Faixa azul full-width */}
        <div className="mt-12 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
              Mais do que um evento
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-snug">
              Múltiplas fontes de receita, uma plataforma
            </h2>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Tag className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold text-white">Venda para atletas</p>
                  <p className="mt-0.5 text-sm text-blue-100/80">
                    Inscrições online com pagamento integrado. O dinheiro cai direto na sua conta, sem intermediário.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <ClipboardList className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold text-white">Venda para plateia</p>
                  <p className="mt-0.5 text-sm text-blue-100/80">
                    Ingressos digitais para espectadores. Mais receita no mesmo evento, com check-in por QR Code.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Megaphone className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold text-white">Crie sua comunidade de seguidores</p>
                  <p className="mt-0.5 text-sm text-blue-100/80">
                    Quem participa vira seguidor. Divulgue o próximo evento pra quem já ama o que você faz.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={cta.href}
                className="flex-1 rounded-2xl bg-white py-3 text-center text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                {cta.label}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="flex-1 rounded-2xl border border-white/30 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Já tenho conta — entrar
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Preço / confiança */}
        <div className="mx-auto mt-12 max-w-3xl px-6">
          <div className="rounded-3xl bg-[#0f0f13] p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/15">
              <ShieldCheck className="size-6 text-blue-400" />
            </div>
            <p className="mt-4 text-xl font-bold text-white">
              Quanto custa? Nada pra começar.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
              Sem mensalidade e sem taxa de cadastro. A plataforma só ganha
              quando você ganha — uma pequena taxa por inscrição paga.
            </p>
            <div className="mx-auto mt-5 flex max-w-md flex-col gap-2 text-left">
              {[
                "Pix do atleta cai no mesmo dia",
                "Você só paga quando recebe",
                "Repasse automático — a plataforma não segura seu dinheiro",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href={cta.href}
              className="mt-6 inline-block rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              {cta.label}
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl px-6 text-center">
          <Link
            href="/termos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600"
          >
            <FileText className="size-4" /> Termos de uso
          </Link>
        </div>

      </div>
    </div>
  );
}
