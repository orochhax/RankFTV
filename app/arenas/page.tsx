import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Smartphone,
  Zap,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Clock,
} from "lucide-react";
import { PageContainer } from "@/components/shell/PageContainer";
import { DesktopSheetContourLight } from "@/components/shell/DesktopSheetContourLight";

export const metadata = {
  title: "Arenas & CTs (Em breve) — RankFTV",
  description: "Conheça a futura Central de Arenas e Centros de Treinamento de Futevôlei do RankFTV para professores e alunos.",
};

const PROFESSOR_BENEFITS = [
  {
    icon: Users,
    title: "Controle de Alunos & Turmas",
    desc: "Chega de anotações soltas no WhatsApp. Saiba quem está matriculado, alunos faltosos, reposições e histórico de aulas experimentais por turma.",
  },
  {
    icon: CalendarCheck,
    title: "Grade de Horários & Quadras",
    desc: "Visualização clara da ocupação das quadras em tempo real. Evite conflitos de horário, gerencie locações e diárias sem dor de cabeça.",
  },
  {
    icon: CreditCard,
    title: "Cobranças Automáticas via Pix & Cartão",
    desc: "Notificações automáticas de vencimento para seus mensalistas. Reduza a inadimplência com repasses pontuais e histórico financeiro na palma da mão.",
  },
  {
    icon: TrendingUp,
    title: "Vitrine Pública para Novos Alunos",
    desc: "Sua arena visível para milhares de praticantes de futevôlei da sua região que já usam o RankFTV, atraindo novos atletas organicamente.",
  },
];

const ALUNO_BENEFITS = [
  {
    icon: Smartphone,
    title: "Agendamento em Poucos Cliques",
    desc: "Encontre horários livres de aulas avulsas ou aluguel de quadra na sua arena favorita e reserve direto pelo celular em segundos.",
  },
  {
    icon: Zap,
    title: "Pagamento Instantâneo sem Comprovante",
    desc: "Pague com Pix dinâmico ou cartão. Sua vaga é confirmada na mesma hora no sistema, sem precisar mandar print de comprovante no WhatsApp.",
  },
  {
    icon: Clock,
    title: "Histórico de Treinos & Frequência",
    desc: "Acompanhe seus dias de treino, créditos de aulas restantes, reposições com regras claras e sua evolução no esporte.",
  },
  {
    icon: Award,
    title: "Comunidade & Torneios Internos",
    desc: "Fique por dentro dos campeonatos internos da sua arena, acompanhe seus resultados e encontre parceiros de jogo no seu nível.",
  },
];

export default function ArenasPage() {
  return (
    <div className="min-h-screen">
      {/* Cabeçalho Escuro da Marca */}
      <div className="bg-brand-dark px-6 pb-16 pt-8">
        <PageContainer width="wide">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Em breve • Em construção
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Central de Arenas & CTs
          </h1>
          <p className="mt-2 max-w-2xl text-base text-zinc-300">
            A plataforma completa que vai conectar donos de arena, professores e alunos de futevôlei em uma só experiência moderna.
          </p>
        </PageContainer>
      </div>

      {/* Folha Arredondada Branca */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:pb-16">
        <DesktopSheetContourLight />
        <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />

        <PageContainer width="wide" className="space-y-10">
          {/* Faixa introdutória */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-amber-50/60 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-soft">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    O futuro do dia a dia das arenas no RankFTV
                  </h2>
                  <p className="text-sm text-gray-600">
                    Estamos desenvolvendo um módulo exclusivo para profissionalizar a rotina de quem ensina e dar comodidade para quem treina.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="size-3.5" />
                Lançamento pós-V1
              </span>
            </div>
          </div>

          {/* Comparativo em 2 Colunas: Professor x Aluno */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Coluna 1: Professores & Donos de Arena */}
            <div className="flex flex-col rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 via-white to-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  <GraduationCap className="size-3.5" />
                  Para Professores & Arenas
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Organize seu CT sem planilhas e sem estresse
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Tudo o que você precisa para gerenciar seus treinos, alunos e faturamento com menos esforço manual:
              </p>

              <div className="mt-6 space-y-5">
                {PROFESSOR_BENEFITS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4 items-start">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-amber-100/80 text-xs text-amber-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-amber-600 shrink-0" />
                Painel exclusivo de gestão financeira e de turmas.
              </div>
            </div>

            {/* Coluna 2: Alunos & Atletas */}
            <div className="flex flex-col rounded-3xl border border-blue-200/70 bg-gradient-to-b from-blue-50/40 via-white to-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  <Users className="size-3.5" />
                  Para Alunos & Atletas
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Tudo para treinar, jogar e evoluir no esporte
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                A facilidade que faltava para marcar suas aulas e focar exclusivamente no que importa: evoluir em quadra.
              </p>

              <div className="mt-6 space-y-5">
                {ALUNO_BENEFITS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4 items-start">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-blue-100/80 text-xs text-blue-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                Reserva rápida e pagamento direto no celular.
              </div>
            </div>
          </div>

          {/* Banner de Acesso Antecipado / Pré-Cadastro */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900 p-6 sm:p-8 text-white shadow-md">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                  <Sparkles className="size-3.5" />
                  Programa de Arenas Pioneiras
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                  Tem uma arena ou dá aulas de futevôlei?
                </h3>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  Estamos selecionando os primeiros centros de treinamento para testar o RankFTV Arenas com suporte prioritário e condições exclusivas de lançamento.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href="/suporte"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-soft shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98]"
                >
                  <span>Quero ser uma arena parceira</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Detalhes de fundo sutil */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-blue-600/20 blur-3xl"
            />
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
