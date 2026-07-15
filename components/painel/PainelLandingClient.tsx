"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  QrCode,
  Wallet,
  Network,
  Megaphone,
  Shirt,
  ShieldCheck,
  MessageSquare,
  ClipboardList,
  FileText,
  CalendarCheck,
  Users,
  Banknote,
  GraduationCap,
  Trophy,
  Building2,
  MapPin,
} from "lucide-react";
import { StickyCTA } from "@/components/shell/StickyCTA";

type Tab = "eventos" | "arena";

// ── Conteúdo: CRIAR EVENTO ─────────────────────────────────────────
const MOMENTOS_EVENTO = [
  {
    fase: "Antes do evento",
    items: [
      { icon: Wallet,       titulo: "Inscrições online",       desc: "Atletas se inscrevem e pagam direto pela plataforma. Sem cobrar no WhatsApp, sem Pix perdido." },
      { icon: Banknote,     titulo: "Dinheiro na conta",       desc: "O valor de cada inscrição paga cai direto na sua conta conforme as duplas vão confirmando — antes mesmo do evento." },
      { icon: Shirt,        titulo: "Lista de camisas pronta", desc: "Quantas P, M, G e GG encomendar? A plataforma calcula automaticamente com base nas inscrições." },
      { icon: Users,        titulo: "Ingressos para plateia",  desc: "Venda entradas digitais para espectadores. Mais receita no mesmo evento, sem esforço extra." },
    ],
  },
  {
    fase: "No dia",
    items: [
      { icon: QrCode,       titulo: "Check-in por QR Code",   desc: "Cada atleta tem a credencial no celular. A portaria flui sem fila, sem papel, sem confusão." },
      { icon: Network,      titulo: "Chave ao vivo",           desc: "Atletas e público acompanham os resultados em tempo real pelo celular, sem você precisar postar nada." },
      { icon: ClipboardList,titulo: "Controle de presença",    desc: "Veja em tempo real quem chegou, quem não confirmou e quantas vagas sobraram na chave." },
      { icon: Megaphone,    titulo: "Aviso com um clique",     desc: "Mudou o horário? Tem um comunicado? Avise todos os inscritos de uma vez — sem grupo de zap." },
    ],
  },
];

// ── Conteúdo: MINHA ARENA ──────────────────────────────────────────
const DORES_ARENA = [
  { icon: MessageSquare, texto: "Cobrar mensalidade pelo WhatsApp e torcer pra todo mundo pagar em dia" },
  { icon: ClipboardList, texto: "Controle de alunos e presença em planilha que ninguém consegue manter atualizada" },
  { icon: CalendarCheck, texto: "Sem saber quais horários estão livres na quadra sem ligar ou mandar mensagem" },
];

const FEATURES_ARENA = [
  {
    icon: GraduationCap,
    titulo: "Mensalidades automáticas",
    descricao: "Cadastre alunos, defina o valor e a data de vencimento. A cobrança sai sozinha — você só acompanha quem pagou.",
  },
  {
    icon: CalendarCheck,
    titulo: "Aluguéis de quadra",
    descricao: "Registre reservas e receba o pagamento online. Sem WhatsApp pra confirmar, sem Pix que some.",
  },
  {
    icon: Banknote,
    titulo: "Diárias avulsas",
    descricao: "Venda acesso por dia pra quem não é mensalista. Mais receita no mesmo espaço, sem trabalho extra.",
  },
  {
    icon: Users,
    titulo: "Controle de frequência",
    descricao: "Veja quais alunos estão sumindo antes que eles cancelem. Aja cedo e segure a receita recorrente.",
  },
];

// ── Subcomponentes ─────────────────────────────────────────────────
function SectionEvento({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <div className="px-6 pt-10 pb-24">
      <div className="mx-auto max-w-3xl space-y-14">

        {/* Prova social */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6">
          <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-widest text-blue-200">
            Resultados reais
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { numero: "+14",    label: "campeonatos", icon: Trophy },
              { numero: "+400",   label: "atletas",     icon: Users  },
              { numero: "Brasil", label: "todo o país", icon: MapPin },
            ].map(({ numero, label, icon: Icon }) => (
              <div key={numero} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 py-4 px-2 text-center backdrop-blur-sm">
                <div className="flex size-8 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="size-4 text-white" strokeWidth={2} />
                </div>
                <p className="text-3xl font-black tracking-tight text-white">{numero}</p>
                <p className="text-[11px] font-medium leading-tight text-blue-100">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Abertura empática + dores */}
        <section className="space-y-5">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              A gente conhece essa realidade
            </p>
            <h2 className="text-2xl font-bold leading-snug text-gray-900">
              Organizar campeonato no braço<br className="hidden sm:block" /> cansa — e dá pra ser diferente.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: Wallet,       texto: "Cobrar inscrição pelo Pix e torcer pra todo mundo pagar antes da data" },
              { icon: ClipboardList,texto: "Semana toda no zap confirmando tamanho de camisa e se a pessoa vai mesmo comparecer" },
              { icon: QrCode,       texto: "No dia, você vira segurança de portaria quando devia estar com foco no evento" },
            ].map(({ icon: Icon, texto }) => (
              <div key={texto} className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                <Icon className="mt-0.5 size-5 shrink-0 text-red-300" strokeWidth={1.8} />
                <p className="text-sm leading-relaxed text-red-700">{texto}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-base font-semibold text-blue-600">
            Com a RankFTV, você para de apagar incêndio<br className="hidden sm:block" /> e começa a organizar de verdade.
          </p>
        </section>

        {/* Features por momento */}
        <section className="space-y-8">
          {MOMENTOS_EVENTO.map(({ fase, items }) => (
            <div key={fase}>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-blue-100" />
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">{fase}</p>
                <div className="h-px flex-1 bg-blue-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map(({ icon: Icon, titulo, desc }) => (
                  <div key={titulo} className="flex items-start gap-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                      <Icon className="size-4 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600">{titulo}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Imagem da plataforma */}
        <section className="overflow-hidden rounded-3xl bg-gray-50 ring-1 ring-black/5">
          <Image
            src="/rankftv-mockup.png"
            alt="RankFTV no desktop e celular"
            width={800}
            height={600}
            className="w-full object-contain"
          />
        </section>

        {/* CTA final */}
        <section className="rounded-3xl bg-black p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/15">
            <MapPin className="size-6 text-blue-400" />
          </div>
          <p className="mt-4 text-xl font-bold text-white">
            Pronto pra organizar do jeito certo?
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
            Leva menos de 10 minutos pra publicar seu primeiro campeonato.
          </p>
          <Link
            href={ctaHref}
            className="mt-6 inline-block rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            {ctaLabel}
          </Link>
        </section>

        <div className="text-center">
          <Link href="/termos" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600">
            <FileText className="size-4" /> Termos de uso
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionArena({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="px-6 pt-10 pb-24">
      <div className="mx-auto max-w-3xl space-y-14">

        {/* Abertura empática + dores */}
        <section className="space-y-5">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              A gente conhece essa realidade
            </p>
            <h2 className="text-2xl font-bold leading-snug text-gray-900">
              Gerir uma arena no braço<br className="hidden sm:block" /> é trabalho dobrado — e dá pra ser diferente.
            </h2>
          </div>
          <div className="space-y-3">
            {DORES_ARENA.map(({ icon: Icon, texto }) => (
              <div key={texto} className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                <Icon className="mt-0.5 size-5 shrink-0 text-red-300" strokeWidth={1.8} />
                <p className="text-sm leading-relaxed text-red-700">{texto}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-base font-semibold text-blue-600">
            Com a RankFTV, sua arena se paga sozinha<br className="hidden sm:block" /> enquanto você foca no esporte.
          </p>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-blue-100" />
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">O que você ganha</p>
            <div className="h-px flex-1 bg-blue-100" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES_ARENA.map(({ icon: Icon, titulo, descricao }) => (
              <div key={titulo} className="flex items-start gap-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                  <Icon className="size-4 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-600">{titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resumo de receitas */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
            Visão completa
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-snug">
            Toda a receita da arena<br className="hidden sm:block" /> em um painel só
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {[
              { icon: GraduationCap, titulo: "Receita recorrente",     desc: "Veja em tempo real quanto os mensalistas estão gerando e quem está em atraso." },
              { icon: CalendarCheck, titulo: "Aluguéis e diárias",      desc: "Histórico completo de todos os pagamentos por quadra e por dia." },
              { icon: Banknote,      titulo: "Cobranças sem esforço",   desc: "O Pix ou boleto sai automático. Você só confirma quando cair na conta." },
            ].map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo} className="flex items-start gap-4 rounded-2xl bg-white/10 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-bold text-white">{titulo}</p>
                  <p className="mt-0.5 text-sm text-blue-100/80">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={ctaHref}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Gerenciar minha arena
          </Link>
        </section>

        {/* CTA final */}
        <section className="rounded-3xl bg-black p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/15">
            <ShieldCheck className="size-6 text-blue-400" />
          </div>
          <p className="mt-4 text-xl font-bold text-white">Grátis pra começar.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            Cadastre sua arena agora e veja como é gerir sem planilha e sem WhatsApp.
          </p>
          <Link
            href={ctaHref}
            className="mt-6 inline-block rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Gerenciar minha arena
          </Link>
        </section>

        <div className="text-center">
          <Link href="/termos" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600">
            <FileText className="size-4" /> Termos de uso
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────
export function PainelLandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "arena" ? "arena" : "eventos";
  const [tab, setTab] = useState<Tab>(initialTab);

  const ctaEventoHref  = isLoggedIn ? "/painel/novo-campeonato" : "/cadastro";
  const ctaEventoLabel = isLoggedIn ? "Criar meu evento grátis" : "Criar minha conta";
  const ctaArenaHref   = isLoggedIn ? "/perfil/ativar-arena" : "/cadastro";

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "eventos", label: "Meu Evento",  icon: Trophy },
    { id: "arena",   label: "Minha Arena", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* ── Header — rola normalmente, só o CTA principal vira fixo ── */}
      <div className="bg-black px-6 py-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
              Para organizadores
            </span>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">
              Painel do organizador
            </h1>
          </div>

          {/* Toggle */}
          <div className="flex rounded-2xl bg-white/8 p-1 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Botão de ação — só para visitantes não logados, muda conforme a aba.
              Fica no fluxo normal; quando sair da viewport, um clone fixo assume o lugar. */}
          {!isLoggedIn && (
            tab === "eventos" ? (
              <StickyCTA
                key="eventos"
                href="/cadastro"
                label="Criar Evento"
                icon={Trophy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              />
            ) : (
              <StickyCTA
                key="arena"
                href="/cadastro?next=/painel%3Ftab%3Darena"
                label="Gerenciar Arena"
                icon={Building2}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              />
            )
          )}
        </div>
      </div>

      {/* faixa escura não-sticky — a curva aparece aqui */}
      <div className="h-6 bg-black" />

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 rounded-t-3xl bg-app-bg shadow-sm">
        <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />
        {tab === "eventos" ? (
          <SectionEvento ctaHref={ctaEventoHref} ctaLabel={ctaEventoLabel} />
        ) : (
          <SectionArena ctaHref={ctaArenaHref} />
        )}
      </div>
    </div>
  );
}
