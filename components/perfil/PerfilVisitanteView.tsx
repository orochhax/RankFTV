import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  LogIn,
  Ticket,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { PageContainer } from "@/components/shell/PageContainer";

const PUBLIC_SHORTCUTS = [
  {
    href: "/meus-ingressos",
    label: "Consultar ingresso",
    description: "Veja seu QR Code de inscrição ou plateia pelo código",
    icon: Ticket,
    iconColor: "text-brand",
  },
  {
    href: "/agenda",
    label: "Agenda de eventos",
    description: "Confira as datas dos próximos campeonatos",
    icon: CalendarDays,
    iconColor: "text-gray-400",
  },
  {
    href: "/campeonatos",
    label: "Explorar campeonatos",
    description: "Encontre etapas com inscrições abertas",
    icon: Trophy,
    iconColor: "text-gray-400",
  },
];

/** Visão exibida em /perfil quando o visitante navega sem sessão autenticada. */
export function PerfilVisitanteView() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-dark px-6 pb-16 pt-6 md:pb-10">
        <PageContainer width="wide" className="space-y-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white md:hidden"
          >
            <ArrowLeft className="size-4" />
            Início
          </Link>

          <div className="flex flex-col items-center gap-3 pb-2 text-center md:flex-row md:items-center md:text-left">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-2 ring-white/25">
              <User className="size-9" strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
                Você está deslogado
              </span>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Visitante RankFTV
              </h1>
              <p className="text-sm text-zinc-300">
                Entre na sua conta ou cadastre-se para ver ingressos, rating e painéis.
              </p>
            </div>
          </div>
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-32 pt-6 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <PageContainer width="wide" className="space-y-5 md:grid md:grid-cols-3 md:items-start md:gap-8 md:space-y-0">
          <div className="space-y-5 md:col-span-2">
            <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">
                Conta RankFTV
              </p>
              <h2 className="mt-1 text-lg font-bold text-ink">
                Nenhuma conta conectada no momento
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Faça login ou crie sua conta gratuita para acompanhar suas inscrições,
                acessar QR Codes de entrada, histórico competitivo e gerenciar eventos ou arenas.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/login?next=/perfil"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <LogIn className="size-4" />
                  Fazer login
                </Link>
                <Link
                  href="/cadastro"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-border transition-colors hover:bg-surface-2"
                >
                  <UserPlus className="size-4 text-brand" />
                  Criar conta grátis
                </Link>
              </div>
            </section>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Acesso rápido sem login
              </h3>
              {PUBLIC_SHORTCUTS.map(({ href, label, description, icon: Icon, iconColor }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`size-4 ${iconColor}`} />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-400">{description}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-gray-300" />
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Organizador
              </h2>
              <Link
                href="/para-voce?aba=campeonato"
                className="block rounded-2xl bg-brand-dark p-5 text-white transition-colors hover:bg-brand-dark-2"
              >
                <div className="flex items-center gap-2 text-accent">
                  <Trophy className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Campeonatos</span>
                </div>
                <p className="mt-2 text-base font-semibold">Quer organizar um campeonato?</p>
                <p className="mt-1 text-sm text-app-bg/75">
                  Inscrições, chaveamento ao vivo e financeiro completo sem mensalidade fixa.
                </p>
                <p className="mt-3 flex items-center gap-1 text-sm font-medium text-accent">
                  Conhecer benefícios <ChevronRight className="size-4" />
                </p>
              </Link>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Arena
              </h2>
              <Link
                href="/para-voce?aba=arena"
                className="block rounded-2xl bg-white p-5 ring-1 ring-black/5 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-2 text-brand-ink">
                  <Building2 className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Para arenas</span>
                </div>
                <p className="mt-2 font-semibold text-ink">Tem uma arena de futevôlei?</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Gerencie turmas, presenças pelo celular e cobranças automáticas.
                </p>
                <p className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-ink">
                  Ver recursos e planos <ChevronRight className="size-4" />
                </p>
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
