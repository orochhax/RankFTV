import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChampionships } from "@/lib/supabase/championships";
import { formatBRL, formatDateRangeBR } from "@/lib/format";

export default async function PainelGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { de, ate } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizer_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!org) redirect("/painel");

  const todos = await getMyChampionships(user.id);

  // Filtro de datas
  const campsFiltrados = todos.filter((c) => {
    if (de && c.dataInicio < de) return false;
    if (ate && c.dataFim > ate) return false;
    return true;
  });

  // Inscrições de todos os campeonatos filtrados
  const ids = campsFiltrados.map((c) => c.id);
  const { data: regs } = ids.length > 0
    ? await supabase
        .from("registrations")
        .select("valor, status_pagamento")
        .in("championship_id", ids)
    : { data: [] };

  const regsPagas    = (regs ?? []).filter((r) => r.status_pagamento === "pago");
  const regsPendente = (regs ?? []).filter((r) => r.status_pagamento === "pendente");
  const regsEstorno  = (regs ?? []).filter((r) => r.status_pagamento === "estornado");

  // A taxa é paga pelo comprador → o organizador recebe o valor cheio.
  const totalBruto   = regsPagas.reduce((s, r) => s + Number(r.valor), 0);
  const totalLiquido = totalBruto;
  const totalPendente  = regsPendente.reduce((s, r) => s + Number(r.valor), 0);
  const totalEstornado = regsEstorno.reduce((s, r) => s + Number(r.valor), 0);

  const campsAbertos    = campsFiltrados.filter((c) => c.status === "inscricoes_abertas").length;
  const campsEmAndamento = campsFiltrados.filter((c) => c.status === "em_andamento").length;
  const campsEncerrados = campsFiltrados.filter((c) => c.status === "encerrado").length;

  return (
    <div className="min-h-screen">
      {/* Cabeçalho */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href="/painel"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Painel
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Painel Geral</h1>
          <p className="text-sm text-white/40">Consolidado de todos os seus campeonatos</p>

          {/* Filtro de período */}
          <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/10 p-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">De</label>
              <input
                type="date"
                name="de"
                defaultValue={de ?? ""}
                className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Até</label>
              <input
                type="date"
                name="ate"
                defaultValue={ate ?? ""}
                className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Filtrar
            </button>
            {(de || ate) && (
              <Link href="/painel/geral" className="text-sm text-white/40 hover:text-white/70">
                Limpar
              </Link>
            )}
          </form>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Camps totais</p>
              <p className="text-2xl font-bold text-white">{campsFiltrados.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Duplas pagas</p>
              <p className="text-2xl font-bold text-white">{regsPagas.length}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <p className="text-xs text-blue-400">Saldo Bruto</p>
              <p className="text-xl font-bold text-blue-300">{formatBRL(totalBruto)}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <p className="text-xs text-blue-400">Saldo Líquido</p>
              <p className="text-xl font-bold text-blue-300">{formatBRL(totalLiquido)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="relative -mt-6 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Status dos campeonatos */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status dos campeonatos</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 text-center">
                <p className="text-2xl font-bold text-blue-700">{campsAbertos}</p>
                <p className="text-xs text-blue-600 mt-1">Inscrições abertas</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 text-center">
                <p className="text-2xl font-bold text-blue-700">{campsEmAndamento}</p>
                <p className="text-xs text-blue-600 mt-1">Em andamento</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 text-center">
                <p className="text-2xl font-bold text-gray-600">{campsEncerrados}</p>
                <p className="text-xs text-gray-500 mt-1">Encerrados</p>
              </div>
            </div>
          </section>

          {/* Financeiro consolidado */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Financeiro consolidado</h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-500" />
                  <p className="text-sm text-gray-700">Saldo Bruto (recebido)</p>
                </div>
                <p className="font-semibold text-gray-900">{formatBRL(totalBruto)}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-blue-500" />
                  <p className="text-sm text-gray-700">Saldo Líquido (após taxas)</p>
                </div>
                <p className="font-semibold text-gray-900">{formatBRL(totalLiquido)}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <p className="text-sm text-gray-700">Pendente de pagamento</p>
                </div>
                <p className="font-semibold text-amber-600">{formatBRL(totalPendente)}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-red-400" />
                  <p className="text-sm text-gray-700">Estornado</p>
                </div>
                <p className="font-semibold text-red-500">{formatBRL(totalEstornado)}</p>
              </div>
            </div>
          </section>

          {/* Lista de campeonatos */}
          {campsFiltrados.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Campeonatos</h2>
              <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {campsFiltrados.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/painel/campeonatos/${c.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{c.nome}</p>
                        <p className="text-xs text-gray-400">{formatDateRangeBR(c.dataInicio, c.dataFim)} · {c.cidade}-{c.estado}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium text-gray-500">{c.categorias.length} cat.</span>
                        <Users className="size-4 text-gray-300" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
