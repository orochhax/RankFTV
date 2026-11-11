import Link from "next/link";
import {
  Users,
  ArrowRight,
  Sparkles,
  Smartphone,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { PageContainer } from "@/components/shell/PageContainer";

export const metadata = {
  title: "Para Donos de Arena & Professores — RankFTV",
  description: "Automatize a gestão da sua arena de futevôlei, acabe com cobranças manuais e lote suas turmas.",
};

export default function ArenasParaDonosPage() {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#092B20] via-brand-dark to-brand-dark px-6 pb-20 pt-16 md:pt-24">
        <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-brand/20 blur-3xl" />

        <PageContainer width="wide" className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent backdrop-blur-md">
            <Sparkles className="size-3.5 text-accent" />
            Software Oficial para Arenas de Futevôlei
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl md:leading-tight">
            Sua arena cheia e no piloto automático enquanto você dá aula na quadra.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-app-bg/80 sm:text-lg">
            Chega de planilhas de papel, cobranças constrangedoras no WhatsApp e confusão com reposição de aulas.
            Tenha uma plataforma profissional na palma da mão para você, sua equipe e seus alunos.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/arenas/cadastro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-brand/25 transition hover:bg-brand-hover active:scale-95 sm:w-auto"
            >
              Começar cadastro gratuito da arena
              <ArrowRight className="size-5" />
            </Link>
          </div>

          <p className="mt-3 text-xs text-white/60">
            ⚡ Configuração rápida em 2 minutos · Sem necessidade de cartão antecipado
          </p>
        </PageContainer>
      </div>

      {/* 4 Grandes Pilares de Valor (Dores Resolvidas) */}
      <div className="border-y border-white/15 bg-brand-dark-2/40 py-16 md:py-24">
        <PageContainer width="wide">
          <div className="text-center">
            <h2 className="text-2xl font-black text-white sm:text-4xl">
              Tudo o que você precisa para gerenciar sua arena
            </h2>
            <p className="mt-3 text-sm text-app-bg/75 sm:text-base">
              Desenvolvido ouvindo o dia a dia de professores e donos de CTs de todo o Brasil.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pilar 1 */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-brand-dark-2/70 p-6 backdrop-blur-sm transition hover:border-white/25">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/25">
                  <CreditCard className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  Zero Constrangimento de Cobrança
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-app-bg/80">
                  Notificações automáticas no WhatsApp com chave Pix Copia e Cola antes e no dia do vencimento.
                  Você nunca mais precisa cobrar aluno manualmente.
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-3 text-xs font-semibold text-accent">
                ✓ Redução de inadimplência
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-brand-dark-2/70 p-6 backdrop-blur-sm transition hover:border-white/25">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <Smartphone className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  Chamada e Reposição no Celular
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  O aluno marca e desmarca presença no próprio app. Se alguém desmarcar no prazo, a vaga é liberada automaticamente para outro aluno repor.
                </p>
              </div>
              <div className="mt-6 border-t border-slate-700/50 pt-3 text-xs font-semibold text-emerald-400">
                ✓ Quadra sempre cheia
              </div>
            </div>

            {/* Pilar 3 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur-sm transition hover:border-slate-700">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                  <TrendingUp className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  Vitrine Regional no RankFTV
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Sua arena fica visível no diretório público para milhares de praticantes de futevôlei da sua cidade que já competem e usam o RankFTV.
                </p>
              </div>
              <div className="mt-6 border-t border-slate-700/50 pt-3 text-xs font-semibold text-amber-400">
                ✓ Novos alunos organicamente
              </div>
            </div>

            {/* Pilar 4 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur-sm transition hover:border-slate-700">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                  <Users className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  Acessos para Toda a Equipe
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Cadastre seus professores e gerentes. Cada um tem login separado para fazer a chamada das suas próprias turmas com total segurança.
                </p>
              </div>
              <div className="mt-6 border-t border-slate-700/50 pt-3 text-xs font-semibold text-violet-400">
                ✓ Gestão descentralizada
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Como Funciona o Onboarding */}
      <div className="py-16 md:py-24">
        <PageContainer width="wide">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-800/60 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Comece a organizar sua arena hoje mesmo
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Cadastre sua estrutura em menos de 2 minutos e experimente o painel da arena.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <Link
                href="/arenas/cadastro"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-extrabold text-white shadow-lg transition hover:bg-brand-hover active:scale-95 sm:w-auto"
              >
                Cadastrar Minha Arena Gratuitamente
                <ArrowRight className="size-5" />
              </Link>
              <Link
                href="/arenas"
                className="text-xs font-semibold text-white/60 hover:text-white"
              >
                ← Voltar para o diretório de arenas
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Barra Sticky Mobile no Rodapé */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-white/15 bg-brand-dark/95 p-3 backdrop-blur-md sm:hidden">
        <Link
          href="/arenas/cadastro"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-md active:bg-brand-hover"
        >
          Cadastrar Minha Arena
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
