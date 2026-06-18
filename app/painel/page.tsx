import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Plus,
  Tag,
  QrCode,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Shirt,
  Megaphone,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { formatDateRangeBR } from "@/lib/format";

const AREAS_DE_GESTAO = [
  "Inscrições",
  "Credenciamento/check-in",
  "Camisas/kit",
  "Comunicação",
  "Destaque pago",
];

const BENEFICIOS = [
  {
    icon: CreditCard,
    titulo: "Inscrições e pagamento online",
    descricao:
      "Atletas se inscrevem e pagam direto na plataforma. Pix cai no mesmo dia, débito em D+3 — sem PIX manual, sem planilha.",
  },
  {
    icon: QrCode,
    titulo: "Credenciamento por QR",
    descricao:
      "Cada atleta recebe uma credencial digital no celular. Check-in na portaria em segundos, com controle de no-show automático.",
  },
  {
    icon: BarChart3,
    titulo: "Motor de categoria balanceada",
    descricao:
      "A plataforma indica a categoria certa pra cada dupla com base no histórico e pontução, reduzindo inscrições incompatíveis com o nível.",
  },
  {
    icon: Shirt,
    titulo: "Gestão de camisas e kit",
    descricao:
      "Painel de produção por tamanho — saiba exatamente quantas camisas P, M, G e GG encomendar antes do evento.",
  },
  {
    icon: Megaphone,
    titulo: "Comunicação com inscritos",
    descricao:
      "Avise todos os participantes com um clique: mudança de horário, resultado, informações do local.",
  },
  {
    icon: ShieldCheck,
    titulo: "Financeiro em tempo real",
    descricao:
      "Acompanhe quanto entrou, quanto está a caminho e quanto já foi repassado — tudo transparente, sem surpresa.",
  },
];

export default async function PainelOrganizadorPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Caso 1 — não logado
  // Caso 2 — logado mas sem conta de organizador
  let isOrganizer = false;
  if (user) {
    const { data } = await supabase
      .from("organizer_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    isOrganizer = !!data;
  }

  // Caso 3 — organizador ativo → mostra o painel real
  if (user && isOrganizer) {
    const todos = await getMyChampionships(user.id);
    const abertos  = todos.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento");
    const rascunhos = todos.filter((c) => c.status === "rascunho");
    const encerrados = todos.filter((c) => c.status === "encerrado");

    // Padrão: abertos ordenados do mais próximo pro mais distante.
    // Filtro ativo: rascunhos ou encerrados.
    const filtroAtivo =
      filtro === "rascunho" ? "rascunho" :
      filtro === "encerrado" ? "encerrado" :
      filtro === "todos" ? "todos" : "aberto";

    const lista =
      filtroAtivo === "rascunho"  ? rascunhos :
      filtroAtivo === "encerrado" ? [...encerrados].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)) :
      filtroAtivo === "todos"     ? [...todos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)) :
      [...abertos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

    const FILTROS = [
      { key: "todos",     label: `Todos (${todos.length})` },
      { key: "aberto",    label: `Abertos (${abertos.length})` },
      { key: "rascunho",  label: `Rascunhos (${rascunhos.length})` },
      { key: "encerrado", label: `Encerrados (${encerrados.length})` },
    ];

    return (
      <div className="min-h-screen">
        {/* ── Cabeçalho preto ── */}
        <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Painel do organizador</h1>
              <Link
                href="/painel/novo-campeonato"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus className="size-4" /> Criar campeonato
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Campeonatos</p>
                <p className="text-2xl font-bold text-white">{todos.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Abertos</p>
                <p className="text-2xl font-bold text-white">{abertos.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Rascunhos</p>
                <p className="text-2xl font-bold text-white">{rascunhos.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Lista de campeonatos ── */}
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
          <div className="mx-auto max-w-4xl space-y-4">

            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTROS.map(({ key, label }) => (
                <Link
                  key={key}
                  href={key === "aberto" ? "/painel" : `/painel?filtro=${key}`}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filtroAtivo === key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Painel Geral — consolidado de todos os camps */}
            <Link
              href="/painel/geral"
              className="flex w-full items-center justify-between rounded-2xl bg-gray-900 px-5 py-4 text-white transition-colors hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="size-5 text-blue-400" />
                <div>
                  <p className="font-semibold text-white">Painel Geral</p>
                  <p className="text-xs text-white/40">Consolidado de todos os campeonatos</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-white/30" />
            </Link>

            {lista.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
                <p className="text-sm text-gray-500">
                  {filtroAtivo === "aberto"   ? "Nenhum campeonato aberto no momento." :
                   filtroAtivo === "rascunho" ? "Nenhum rascunho salvo." :
                   filtroAtivo === "todos"    ? "Nenhum campeonato criado ainda." :
                                               "Nenhum campeonato encerrado."}
                </p>
                {filtroAtivo === "aberto" && (
                  <Link
                    href="/painel/novo-campeonato"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="size-4" /> Criar campeonato
                  </Link>
                )}
              </div>
            ) : (
              <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {lista.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/painel/campeonatos/${c.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{c.nome}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatDateRangeBR(c.dataInicio, c.dataFim)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {c.cidade}-{c.estado}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="size-3" />
                            {c.categorias.length}{" "}
                            {c.categorias.length === 1 ? "categoria" : "categorias"}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                      <ChevronRight className="size-4 shrink-0 text-gray-300" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Caso 1 e 2 — landing page de conversão
  const cta = user
    ? { href: "/perfil/ativar-organizador", label: "Ativar minha conta de organizador" }
    : { href: "/cadastro", label: "Criar conta grátis" };

  return (
    <div className="min-h-screen">
      {/* ── Hero preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-20 pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
            Para organizadores
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white">
            Organize campeonatos
            <br />
            do jeito certo
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Inscrições online, pagamento automático e credenciamento por QR —
            tudo numa plataforma só. Chega de PIX manual e planilha no WhatsApp.
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

          {!user && (
            <p className="mt-3 text-xs text-white/30">Gratuito nos primeiros eventos</p>
          )}
        </div>
      </div>

      {/* ── Benefícios ── */}
      <div className="relative -mt-6 rounded-t-3xl bg-white px-6 pb-24 pt-10 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            O que você ganha
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFICIOS.map(({ icon: Icon, titulo, descricao }) => (
              <div key={titulo} className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600">
                  <Icon className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-gray-900">{titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{descricao}</p>
              </div>
            ))}
          </div>

          {/* CTA final */}
          <div className="mt-10 rounded-2xl bg-[#0f0f13] p-8 text-center">
            <p className="text-lg font-bold text-white">Pronto pra começar?</p>
            <p className="mt-1 text-sm text-white/50">
              Leva menos de 2 minutos pra criar seu primeiro campeonato.
            </p>
            <Link
              href={cta.href}
              className="mt-5 inline-block rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
