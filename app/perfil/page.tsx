import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ShieldCheck, ShoppingBag, UserPen } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/perfil/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/shell/PageContainer";

const GENERO_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino:  "Feminino",
  outro:     "Outro",
};

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, username, bio, foto_url, rating, genero, cidade, estado")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const [
    { data: campeonatosOrganizados },
    { data: organizerAccount },
    { data: minhaArena },
    { data: vinculoArena },
  ] = await Promise.all([
    supabase
      .from("championships")
      .select("id, nome, status")
      .eq("organizador_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("organizer_accounts")
      .select("habilitado")
      .eq("user_id", user.id)
      .single(),

    supabase
      .from("arenas")
      .select("id, nome, handle")
      .eq("dono_id", user.id)
      .maybeSingle(),

    supabase
      .from("arena_students")
      .select("status, arenas(nome)")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle(),
  ]);

  const totalCampeonatos = campeonatosOrganizados?.length ?? 0;

  // ── Financeiro consolidado dos campeonatos organizados (atletas + plateia) ──
  const champIds = (campeonatosOrganizados ?? []).map((c) => c.id);
  const campsAtivos = (campeonatosOrganizados ?? []).filter(
    (c) => c.status === "inscricoes_abertas" || c.status === "em_andamento"
  ).length;

  const [{ data: regsData }, { data: ticketsData }] = await Promise.all([
    champIds.length > 0
      ? supabase.from("registrations").select("valor, status_pagamento").in("championship_id", champIds)
      : Promise.resolve({ data: [] as { valor: number; status_pagamento: string }[] }),
    champIds.length > 0
      ? supabase.from("spectator_tickets").select("valor, status_pagamento").in("championship_id", champIds)
      : Promise.resolve({ data: [] as { valor: number; status_pagamento: string }[] }),
  ]);
  const arrecadado =
    (regsData ?? []).filter((r) => r.status_pagamento === "pago").reduce((s, r) => s + Number(r.valor), 0) +
    (ticketsData ?? []).filter((t) => t.status_pagamento === "pago").reduce((s, t) => s + Number(t.valor), 0);

  const localizacao = [profile.cidade, profile.estado].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho azul (contido em toda tela, sem esticar borda a borda) ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pb-16 pt-6 md:pb-10">
        <PageContainer width="wide" className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors w-fit md:hidden">
            <ArrowLeft className="size-4" />
            Início
          </Link>

          <div className="flex flex-col items-center gap-2 pb-2 text-center md:flex-row md:items-center md:text-left">
            <Avatar
              nome={profile.nome}
              color="bg-white/15 ring-2 ring-white/30"
              size="lg"
              fotoUrl={profile.foto_url}
            />
            <div>
              <h1 className="text-xl font-bold text-white">{profile.nome}</h1>
              <p className="text-sm text-blue-100">
                @{profile.username}{localizacao && ` · ${localizacao}`}
              </p>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white pb-32 pt-6 shadow-sm md:mt-0 md:rounded-none md:bg-app-bg md:pb-16 md:shadow-none">
        <PageContainer width="wide" className="space-y-5 md:grid md:grid-cols-3 md:items-start md:gap-8 md:space-y-0">
          <div className="space-y-5 md:col-span-2">

            {/* Rating */}
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Rating</p>
                <p className="text-lg font-bold text-gray-900">{profile.rating > 0 ? profile.rating : "—"}</p>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Sua pontuação de nível, calculada a partir do questionário de nível — usada pra
                recomendar sua categoria nos campeonatos que ativam essa opção.{" "}
                <Link href="/perfil/questionario-nivel" className="font-medium text-blue-600 hover:underline">
                  {profile.rating > 0 ? "Refazer questionário" : "Responder questionário"}
                </Link>
              </p>
            </div>

            {/* Minhas Compras */}
            <Link
              href="/minhas-compras"
              className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <ShoppingBag className="size-4 text-gray-400" /> Minhas Compras
              </span>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
            </Link>

            {/* Gênero */}
            <Link
              href="/perfil/questionario"
              className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-900">Gênero</span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className={profile.genero ? "text-blue-600 font-medium" : "text-gray-400"}>
                  {profile.genero ? (GENERO_LABEL[profile.genero] ?? profile.genero) : "Não informado"}
                </span>
                <ChevronRight className="size-4 shrink-0 text-gray-300" />
              </span>
            </Link>

            {/* Editar perfil */}
            <Link
              href="/perfil/editar"
              className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <UserPen className="size-4 text-gray-400" /> Editar perfil
              </span>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
            </Link>

            {/* Configurações da conta */}
            <Link
              href="/perfil/conta"
              className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <ShieldCheck className="size-4 text-gray-400" /> Configurações da conta
              </span>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
            </Link>

            {/* Aluno de arena — marcar presença */}
            {vinculoArena?.status === "ativo" && (
              <Link
                href="/arena/presenca"
                className="flex items-center justify-between rounded-2xl bg-blue-600 px-4 py-4 text-white hover:bg-blue-700"
              >
                <div>
                  <p className="text-sm font-semibold">Marcar presença</p>
                  <p className="mt-0.5 text-xs text-blue-200">
                    {(vinculoArena.arenas as { nome?: string } | null)?.nome ?? "Sua arena"}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0" />
              </Link>
            )}

            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <SignOutButton />
            </div>
          </div>

          {/* Painel lateral — status de organizador e de arena */}
          <div className="space-y-5">
            {/* Organizador */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Organizador</h2>
              {organizerAccount?.habilitado ? (
                <Link
                  href="/painel"
                  className="block rounded-2xl bg-[#0f0f13] p-5 text-white transition-colors hover:bg-[#17171d]"
                >
                  <p className="text-base font-semibold">
                    {totalCampeonatos === 0
                      ? "Nenhum campeonato ainda"
                      : `${campsAtivos} ${campsAtivos === 1 ? "campeonato ativo" : "campeonatos ativos"}`}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {totalCampeonatos === 0
                      ? "Crie seu primeiro campeonato"
                      : `${fmtBRL(arrecadado)} arrecadados no total`}
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-400">
                    Ir para o Painel <ChevronRight className="size-4" />
                  </p>
                </Link>
              ) : organizerAccount && !organizerAccount.habilitado ? (
                <div className="rounded-2xl bg-[#0f0f13] p-5 text-white">
                  <p className="text-base font-semibold">Conta em análise</p>
                  <p className="mt-1 text-sm text-white/50">
                    Você recebe uma notificação quando ela for aprovada.
                  </p>
                </div>
              ) : (
                <Link
                  href="/perfil/ativar-organizador"
                  className="block rounded-2xl bg-[#0f0f13] p-5 text-white transition-colors hover:bg-[#17171d]"
                >
                  <p className="text-base font-semibold">Vire organizador</p>
                  <p className="mt-1 text-sm text-white/50">
                    Qualquer atleta pode criar campeonatos na plataforma.
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-400">
                    Ativar conta de organizador <ChevronRight className="size-4" />
                  </p>
                </Link>
              )}
            </div>

            {/* Arena */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Arena</h2>
              {minhaArena ? (
                <Link
                  href="/arena"
                  className="block rounded-2xl bg-white p-5 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
                >
                  <p className="font-semibold text-gray-900">{minhaArena.nome}</p>
                  <p className="mt-1 text-sm text-gray-500">Alunos, presenças e mensalidades</p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600">
                    Ir pro painel da arena <ChevronRight className="size-4" />
                  </p>
                </Link>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-5">
                  <p className="font-semibold text-gray-900">Você ainda não tem uma arena</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Cadastre sua academia para gerenciar alunos, aulas e mensalidades.
                  </p>
                  <Link
                    href="/perfil/ativar-arena"
                    className="mt-3 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Criar arena
                  </Link>
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
