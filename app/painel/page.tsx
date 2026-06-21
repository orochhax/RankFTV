import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  MapPin,
  Plus,
  Tag,
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
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { formatDateRangeBR } from "@/lib/format";

// Dores do organizador hoje (agitação) — ver funil de conversão.
const DORES = [
  { icon: MessageSquare, texto: "Perseguir no WhatsApp quem ainda não pagou" },
  { icon: ClipboardList, texto: "Planilha pra controlar quem se inscreveu e confirmou" },
  { icon: UserX,         texto: "Fila e confusão na portaria no dia do evento" },
];

// Funcionalidades operacionais (o diferencial vai destacado à parte no JSX).
const FEATURES = [
  {
    icon: QrCode,
    titulo: "Portaria sem caos",
    descricao:
      "Cada atleta recebe a credencial no celular. Check-in por QR em segundos e controle de no-show automático.",
  },
  {
    icon: Wallet,
    titulo: "Dinheiro sem perseguição",
    descricao:
      "Cada inscrição entra confirmada e paga. O Pix cai no mesmo dia e você acompanha em tempo real quanto já é seu — sem PIX manual, sem planilha.",
  },
  {
    icon: Network,
    titulo: "Chaveamento ao vivo",
    descricao:
      "A chave e os resultados aparecem em tempo real pra atletas e público acompanharem do celular — sem mural, sem foto de papel no grupo.",
  },
  {
    icon: Shirt,
    titulo: "Camisas na medida certa",
    descricao:
      "Painel de produção por tamanho: saiba exatamente quantas P, M, G e GG encomendar antes do evento.",
  },
  {
    icon: Megaphone,
    titulo: "Avise todos num clique",
    descricao:
      "Mudança de horário, resultado, informação do local — comunique todos os inscritos de uma vez.",
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
  // Caso 2 — logado mas sem conta de organizador E sem nenhum campeonato
  let isOrganizer = false;
  let todos: Awaited<ReturnType<typeof getMyChampionships>> = [];
  if (user) {
    const [orgRes, champs] = await Promise.all([
      supabase
        .from("organizer_accounts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      getMyChampionships(user.id),
    ]);
    isOrganizer = !!orgRes.data;
    todos = champs;
  }

  // Caso 3 — já tem conta de organizador OU já criou algum campeonato (mesmo
  // rascunho, antes de completar CPF/PIX) → mostra o painel real com a lista.
  if (user && (isOrganizer || todos.length > 0)) {
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

            {/* Atalhos do painel */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/painel/geral"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
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
              <Link
                href="/painel/paginas"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="size-5 text-violet-400" />
                  <div>
                    <p className="font-semibold text-white">Minhas Páginas</p>
                    <p className="text-xs text-white/40">Agrupe edições e ganhe seguidores</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
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

  // Caso 1 e 2 — landing page de conversão.
  // CTA de baixo atrito: criar o campeonato primeiro; ativação (CPF/PIX) fica
  // pra depois, no momento de publicar. Logado vai direto pra criação.
  const cta = user
    ? { href: "/painel/novo-campeonato", label: "Criar campeonato grátis" }
    : { href: "/cadastro", label: "Criar campeonato grátis" };

  return (
    <div className="min-h-screen">
      {/* ── Hero preto ── */}
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

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 rounded-t-3xl bg-white px-6 pb-24 pt-10 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-12">

          {/* Agitação de dor */}
          <section>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              Você conhece isso?
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {DORES.map(({ icon: Icon, texto }) => (
                <div
                  key={texto}
                  className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5"
                >
                  <Icon className="size-5 shrink-0 text-gray-400" strokeWidth={1.8} />
                  <p className="text-sm text-gray-600">{texto}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-base font-medium text-gray-900">
              Tudo isso vira automático. Veja como 👇
            </p>
          </section>

          {/* Diferencial em destaque */}
          <section>
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-7 text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="size-3.5" /> Exclusivo
              </span>
              <h2 className="mt-3 text-2xl font-bold">Categoria balanceada</h2>
              <p className="mt-2 max-w-xl text-blue-50/90">
                A plataforma indica a categoria certa pra cada dupla com base no
                histórico e no nível dos atletas. Menos dupla forte jogando em
                categoria fraca, chave mais justa e atleta mais satisfeito — algo
                que nenhuma planilha faz.
              </p>
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

          {/* Dinheiro / confiança — taxa enquadrada como risco zero */}
          <section>
            <div className="rounded-3xl bg-[#0f0f13] p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                <ShieldCheck className="size-6 text-emerald-400" />
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
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
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
          </section>

        </div>
      </div>
    </div>
  );
}
