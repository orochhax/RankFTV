import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Escolha seu Plano de Ativação — Etapa 2 — RankFTV",
  description: "Selecione o melhor plano para o tamanho da sua arena de futevôlei.",
};

export default async function CadastroArenaEtapa2Page({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  if (!handle) redirect("/arenas/cadastro");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arenas/cadastro/plano?handle=${handle}`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) redirect("/arena");

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Barra de Progresso */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2">
            <span className="text-emerald-600">Etapa 2 de 2: Ativação da Arena</span>
            <span>100% concluído</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-full rounded-full bg-emerald-600 transition-all duration-500" />
          </div>
        </div>

        {/* Título de Sucesso */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
            <Check className="size-3.5" />
            Arena cadastrada com sucesso!
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Escolha como deseja começar
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
            Você pode começar com capacidade ilimitada no Plano Pro ou testar inicialmente no Plano Start.
          </p>
        </div>

        {/* Cards dos Planos */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-2">
          {/* Card Plano Start (Secundário) */}
          <div className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Plano de Entrada
              </span>
              <h2 className="mt-2 text-2xl font-black text-gray-900">
                Plano Start
              </h2>
              <p className="mt-2 text-xs text-gray-500">
                Ideal para professores autônomos que estão começando a organizar as primeiras turmas.
              </p>

              <div className="mt-6 border-y border-gray-100 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-gray-900">
                    R$ 0
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    /mês fixo
                  </span>
                </div>
                <p className="mt-2 rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700">
                  ⚡ Cobrança de <strong>R$ 4,90 por aluno ativo / mês (recorrente)</strong> limitada a 30 alunos.
                </p>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-gray-700">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Até 30 alunos simultâneos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Chamada e presenças pelo app
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  1 professor / login de dono
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  ✕ Sem cobrança automática WhatsApp
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  ✕ Sem destaque na busca regional
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href={`/arena/${arena.handle}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white py-3.5 text-center text-sm font-bold text-gray-800 transition hover:bg-gray-50 active:scale-95"
              >
                Começar no Plano Start
              </Link>
            </div>
          </div>

          {/* Card Plano Pro (Destaque Principal / Mais Popular) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-blue-600 bg-white p-6 md:p-8 shadow-xl ring-4 ring-blue-500/10">
            <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
              ⭐ Mais Escolhido pelas Arenas
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Crescimento Ilimitado
                </span>
              </div>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-gray-900">
                Plano Pro
                <Zap className="size-5 fill-amber-400 text-amber-500" />
              </h2>
              <p className="mt-2 text-xs text-gray-600">
                A solução completa para arenas que querem automatizar cobranças e crescer sem travas.
              </p>

              <div className="mt-6 border-y border-blue-100 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-blue-600">
                    R$ 139
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    ,00 /mês
                  </span>
                </div>
                <p className="mt-2 rounded-xl bg-blue-50 p-2.5 text-xs font-bold text-blue-900">
                  ✨ Alunos Ilimitados: zero taxa por aluno. Economize e escale sua arena.
                </p>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-gray-800">
                <li className="flex items-center gap-2 font-bold text-gray-900">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Alunos ilimitados (de 0 a quantos quiser)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Lembretes e Pix Copia e Cola automático no WhatsApp
                </li>
                <li className="flex items-center gap-2 font-semibold text-blue-900">
                  <ShieldCheck className="size-4 text-amber-500 shrink-0" />
                  Selo Oficial de Verificado + Topo da Busca Regional
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Radar Anti-Desistência (aviso de faltas consecutivas)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Torneios Internos e Desafios Rei da Praia
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  Professores e equipe ilimitada
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href={`/arena/${arena.handle}/assinatura`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-center text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95"
              >
                <Sparkles className="size-4" />
                Ativar com o Plano Pro
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
