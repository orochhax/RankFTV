import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  DollarSign,
  ExternalLink,
  Link2,
  MapPin,
  Megaphone,
  Pencil,
  QrCode,
  Shirt,
  Users,
  UserCog,
} from "lucide-react";
import { InviteRespondButtons } from "@/components/painel/InviteRespondButtons";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TierTag } from "@/components/ui/TierTag";
import { formatBRL, formatDateRangeBR } from "@/lib/format";
import type { QuizAnswers } from "@/lib/tier";

const ACOES = [
  {
    icon: Users,
    label: "Inscrições",
    desc: "Duplas inscritas e status de pagamento",
    href: (id: string) => `/painel/campeonatos/${id}/inscricoes`,
    disponivel: true,
  },
  {
    icon: DollarSign,
    label: "Financeiro",
    desc: "Entradas, taxas e repasses",
    href: (id: string) => `/painel/campeonatos/${id}/financeiro`,
    disponivel: true,
  },
  {
    icon: QrCode,
    label: "Check-in",
    desc: "Credenciamento e controle de presença",
    href: (id: string) => `/painel/campeonatos/${id}/checkin`,
    disponivel: true,
  },
  {
    icon: Shirt,
    label: "Camisas / Kit",
    desc: "Painel de produção por tamanho",
    href: (id: string) => `/painel/campeonatos/${id}/camisas`,
    disponivel: true,
  },
  {
    icon: CheckSquare,
    label: "Chaveamento",
    desc: "Grade e confrontos automáticos",
    href: (id: string) => `/painel/campeonatos/${id}/chaveamento`,
    disponivel: true,
  },
  {
    icon: UserCog,
    label: "Equipe",
    desc: "Staff e permissões de acesso",
    href: (id: string) => `/painel/campeonatos/${id}/equipe`,
    disponivel: true,
  },
  {
    icon: Megaphone,
    label: "Comunicação",
    desc: "Avisar todos os inscritos",
    href: (id: string) => `/painel/campeonatos/${id}/comunicacao`,
    disponivel: false,
  },
];

export default async function PainelCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();

  // Só o organizador dono pode acessar o painel desse camp.
  if (camp.organizadorId !== user.id) notFound();

  // Tier: quiz do banco + duplas pagas (override automático)
  const [tierRes, paidRes, orgAccountRes, inviteRes] = await Promise.all([
    supabase.from("championships").select("tier_quiz").eq("id", id).maybeSingle(),
    supabase.from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("championship_id", id)
      .eq("status_pagamento", "pago"),
    supabase.from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("page_championship_invites")
      .select("id, page_id, pages(nome, handle)")
      .eq("championship_id", id)
      .eq("status", "pendente")
      .maybeSingle(),
  ]);
  const tierQuiz    = (tierRes.data?.tier_quiz ?? null) as Partial<QuizAnswers> | null;
  const duplasPagas = paidRes.count ?? 0;
  const temChavePix = !!orgAccountRes.data?.chave_pix;
  const pendingInvite = inviteRes.data ?? null;
  const temCategoriaPaga = camp.categorias.some((c) => (c.valorInscricao ?? 0) > 0);

  const vagasTotais = camp.categorias.reduce(
    (acc, c) => acc + ((c as { corteRatingMax?: number; maxDuplas?: number }).maxDuplas ?? 0),
    0,
  );

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Voltar */}
          <Link
            href="/painel"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Painel
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{camp.nome}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  {formatDateRangeBR(camp.dataInicio, camp.dataFim)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {camp.cidade} — {camp.estado}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TierTag quiz={tierQuiz} duplasPagas={duplasPagas} />
              <StatusBadge status={camp.status} />
              <Link
                href={`/painel/campeonatos/${id}/editar`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                <Pencil className="size-3.5" /> Editar
              </Link>
            </div>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Duplas inscritas</p>
              <p className="text-2xl font-bold text-white">0</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Categorias</p>
              <p className="text-2xl font-bold text-white">{camp.categorias.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Vagas totais</p>
              <p className="text-2xl font-bold text-white">
                {vagasTotais > 0 ? vagasTotais : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Convite de vínculo com página pendente */}
          {pendingInvite && (() => {
            const pg = pendingInvite.pages as unknown as { nome: string; handle: string } | null;
            return (
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Link2 className="size-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-blue-900">Convite de vínculo com página</p>
                  <p className="mt-0.5 text-sm text-blue-700">
                    A página <strong>{pg?.nome ?? "—"}</strong>{" "}
                    <span className="text-blue-500">@{pg?.handle}</span> quer vincular este campeonato como etapa dela.
                  </p>
                  <InviteRespondButtons inviteId={pendingInvite.id} campId={id} />
                </div>
              </div>
            );
          })()}

          {/* Aviso: chave Pix não configurada */}
          {temCategoriaPaga && !temChavePix && (
            <Link
              href={`/painel/campeonatos/${id}/financeiro`}
              className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <DollarSign className="size-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900">Configure sua chave Pix</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Este campeonato tem categorias pagas, mas você ainda não configurou onde receber o dinheiro. Os atletas não conseguirão se inscrever até você configurar.
                </p>
                <p className="mt-1 text-xs font-medium text-amber-600">Ir para Financeiro →</p>
              </div>
            </Link>
          )}

          {/* Ações de gestão */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Gestão</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ACOES.map(({ icon: Icon, label, desc, href, disponivel }) => {
                const inner = (
                  <>
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      disponivel ? "bg-blue-600" : "bg-gray-200"
                    }`}>
                      <Icon className={`size-5 ${disponivel ? "text-white" : "text-gray-400"}`} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${disponivel ? "text-gray-900" : "text-gray-400"}`}>{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    {!disponivel && (
                      <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                        Em breve
                      </span>
                    )}
                  </>
                );
                return disponivel ? (
                  <Link
                    key={label}
                    href={href(id)}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={label}
                    className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Link público */}
          {/* Categorias */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Categorias</h2>
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {camp.categorias.map((cat) => {
                const catExt = cat as typeof cat & { maxDuplas?: number };
                return (
                  <li key={cat.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{cat.nome}</p>
                      <p className="text-xs text-gray-400 capitalize">{cat.genero}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {catExt.maxDuplas && (
                        <span className="text-gray-400">
                          0 / {catExt.maxDuplas} duplas
                        </span>
                      )}
                      <span className="font-semibold text-gray-900">
                        {formatBRL(cat.valorInscricao)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <Link
            href={`/campeonatos/${id}`}
            className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="size-4" />
            Ver página pública do campeonato
          </Link>

        </div>
      </div>
    </div>
  );
}
