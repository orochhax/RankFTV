"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  ExternalLink,
  GraduationCap,
  Plane,
  ShieldAlert,
  Users,
  WalletCards,
} from "lucide-react";
import { visaGuides, type VisaCountry, type VisaGuide } from "@/lib/visa-planner-data";
import { withBRLConversions } from "@/lib/visa-planner-currency";

const countryInfo: Record<VisaCountry, { title: string; description: string }> = {
  portugal: {
    title: "Portugal",
    description: "Regras portuguesas para trabalho, turismo, estudo e permanência.",
  },
  espanha: {
    title: "Espanha",
    description: "Regras espanholas para trabalho, turismo, estudo e permanência.",
  },
};

function CountryFlag({ country }: { country: VisaCountry }) {
  if (country === "espanha") {
    return (
      <svg viewBox="0 0 30 20" className="h-5 w-[30px] overflow-hidden rounded-sm shadow-sm" role="img" aria-label="Bandeira da Espanha">
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 30 20" className="h-5 w-[30px] overflow-hidden rounded-sm shadow-sm" role="img" aria-label="Bandeira de Portugal">
      <rect width="12" height="20" fill="#046A38" />
      <rect x="12" width="18" height="20" fill="#DA291C" />
      <circle cx="12" cy="10" r="3.4" fill="#FFCD00" />
      <path d="M10.5 7.6h3v4.2h-3z" fill="#fff" stroke="#DA291C" strokeWidth=".45" />
    </svg>
  );
}

function VisaIcon({ guide }: { guide: VisaGuide }) {
  if (guide.kind === "warning") return <ShieldAlert className="size-5" aria-hidden="true" />;
  if (guide.title === "Trabalho") return <BriefcaseBusiness className="size-5" aria-hidden="true" />;
  if (guide.title === "Turista / curta duração") return <Plane className="size-5" aria-hidden="true" />;
  if (guide.title === "Estudante") return <GraduationCap className="size-5" aria-hidden="true" />;
  return <BookOpenCheck className="size-5" aria-hidden="true" />;
}

function VisaCard({ guide, country, exchangeRate }: { guide: VisaGuide; country: VisaCountry; exchangeRate: number }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `visa-${country}-${guide.id}`;
  const warning = guide.kind === "warning";

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${warning ? "border-amber-300" : "border-slate-200/80"}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-[76px] w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6b5e] sm:px-5"
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${warning ? "bg-amber-100 text-amber-800" : "bg-[#e7efeb] text-[#1f6b5e]"}`}>
          <VisaIcon guide={guide} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            {guide.title}
            {warning && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">Não é visto</span>}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{guide.summary}</span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <div id={panelId} hidden={!expanded} className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {warning && (
          <div role="note" className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-950">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>O card explica o risco para ajudar no planejamento. Permanecer irregular pode resultar em procedimento de retorno e, conforme o caso, proibição de entrada. Procure orientação jurídica individual.</p>
          </div>
        )}

        <div className="grid gap-3">
          <InfoBlock title="Pré-requisitos" items={guide.prerequisites} tone={warning ? "amber" : "green"} exchangeRate={exchangeRate} />
          <InfoBlock title="Dinheiro" items={guide.money} tone="blue" exchangeRate={exchangeRate} />
          {guide.additionalSections?.map((section) => (
            <InfoBlock key={section.title} title={section.title} items={section.items} tone="slate" exchangeRate={exchangeRate} />
          ))}
          <InfoBlock title="Documentação" items={guide.documents} tone="slate" exchangeRate={exchangeRate} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Fontes oficiais</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#1f6b5e] underline decoration-[#1f6b5e]/30 underline-offset-4 hover:decoration-[#1f6b5e]">
                  {source.label}<ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function InfoBlock({ title, items, tone, exchangeRate }: { title: string; items: string[]; tone: "amber" | "green" | "blue" | "slate"; exchangeRate: number }) {
  const tones = {
    amber: "border-amber-100 bg-amber-50/60",
    green: "border-emerald-100 bg-emerald-50/40",
    blue: "border-blue-100 bg-blue-50/40",
    slate: "border-slate-100 bg-slate-50/70",
  };

  return (
    <section className={`rounded-xl border px-3.5 py-3 ${tones[tone]}`} aria-label={title}>
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
        {items.map((item) => <li key={item} className="flex gap-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden="true" /><span>{withBRLConversions(item, exchangeRate)}</span></li>)}
      </ul>
    </section>
  );
}

function CountryColumn({ country, exchangeRate }: { country: VisaCountry; exchangeRate: number }) {
  const info = countryInfo[country];
  return (
    <section aria-labelledby={`${country}-heading`} className="space-y-3">
      <div className="rounded-2xl bg-[#123c36] px-4 py-4 text-white shadow-sm sm:px-5">
        <div className="flex items-center gap-3">
          <div>
            <h3 id={`${country}-heading`} className="flex items-center gap-2 text-lg font-semibold"><CountryFlag country={country} />{info.title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-emerald-50/70">{info.description}</p>
          </div>
        </div>
      </div>
      {visaGuides[country].map((guide) => <VisaCard key={guide.id} guide={guide} country={country} exchangeRate={exchangeRate} />)}
    </section>
  );
}

const studyPlanSteps = [
  "Julia entra em um curso superior elegível na Espanha.",
  "O casal comprova os recursos, seguros e demais documentos.",
  "Julia pode trabalhar até 30h por semana, de forma compatível com o curso.",
  "Carlos acompanha, mas não pode trabalhar durante essa fase.",
];

const qualifiedWorkPlanSteps = [
  "Carlos consegue uma oferta qualificada na Espanha ou em Portugal.",
  "A empresa confirma e apoia o PAC, Cartão Azul UE ou rota equivalente.",
  "Carlos trabalha; Julia solicita a autorização familiar correspondente.",
  "Com a autorização familiar válida, Julia também pode trabalhar.",
];

function PlanSteps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-5 text-slate-600">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ExecutionPlanCards({ exchangeRate }: { exchangeRate: number }) {
  const supportInBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(12_600 * exchangeRate);

  return (
    <section aria-labelledby="execution-plans-heading" className="pt-4 sm:pt-6">
      <div className="mb-5 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1f6b5e]">Decisão da mudança</p>
        <h2 id="execution-plans-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Dois caminhos possíveis para Carlos e Julia</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Compare o que precisa acontecer primeiro, quem poderá trabalhar e qual é a principal trava de cada plano.</p>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <article aria-labelledby="plan-one-title" className="flex h-full flex-col overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                  <GraduationCap className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">Plano 1 · Espanha</p>
                  <h3 id="plan-one-title" className="mt-0.5 text-lg font-semibold text-slate-950">Julia estuda, Carlos acompanha</h3>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Depende do curso</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">A entrada do casal fica baseada na admissão da Julia em um curso superior reconhecido.</p>
          </div>

          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <PlanSteps items={studyPlanSteps} />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><WalletCards className="size-4" aria-hidden="true" /> Referência financeira</div>
                <p className="mt-2 text-xl font-semibold text-slate-950">€ 12.600</p>
                <p className="mt-0.5 text-xs text-slate-500">≈ {supportInBRL} para 12 meses, usando a cotação salva. Curso e demais custos ficam separados.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Users className="size-4" aria-hidden="true" /> Trabalho do casal</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">Julia: até 30h/semana</p>
                <p className="mt-1 text-xs leading-5 text-rose-700">Carlos: sem autorização de trabalho nessa fase.</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-sm">
              <p className="flex gap-2 text-emerald-800"><Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong>Ponto forte:</strong> pode avançar a partir da matrícula, sem esperar uma empresa contratar Carlos.</span></p>
              <p className="flex gap-2 text-amber-900"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong>Principal limitação:</strong> exige reserva financeira e não permite contar com renda de trabalho do Carlos na Espanha.</span></p>
            </div>

            <div className="mt-auto pt-5">
              <div className="rounded-2xl bg-amber-950 px-4 py-3.5 text-amber-50">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-200">Próximo passo</p>
                <p className="mt-1 text-sm font-medium">Escolher o curso da Julia e calcular curso + reserva + mudança.</p>
              </div>
            </div>
          </div>
        </article>

        <article aria-labelledby="plan-two-title" className="flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <BriefcaseBusiness className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Plano 2 · Espanha ou Portugal</p>
                  <h3 id="plan-two-title" className="mt-0.5 text-lg font-semibold text-slate-950">Carlos contratado, Julia acompanha</h3>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Depende de vaga</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">A entrada fica baseada em uma oferta formal de trabalho altamente qualificado com apoio migratório da empresa.</p>
          </div>

          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <PlanSteps items={qualifiedWorkPlanSteps} />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Clock3 className="size-4" aria-hidden="true" /> Espanha</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">Após 2 anos de residência legal e contínua</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Brasileiros podem solicitar nacionalidade. Não é concessão automática.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Clock3 className="size-4" aria-hidden="true" /> Portugal</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">5 anos para residência permanente</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Regra atual: 7 anos para pedir nacionalidade como brasileiro.</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-sm">
              <p className="flex gap-2 text-emerald-800"><Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong>Ponto forte:</strong> com as autorizações corretas, os dois podem trabalhar.</span></p>
              <p className="flex gap-2 text-amber-900"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong>Principal limitação:</strong> o plano só existe depois de uma oferta elegível e do apoio efetivo da empresa.</span></p>
            </div>

            <div className="mt-auto pt-5">
              <div className="rounded-2xl bg-[#123c36] px-4 py-3.5 text-emerald-50">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-200">Próximo passo</p>
                <p className="mt-1 text-sm font-medium">Preparar currículo e portfólio e buscar vagas com visa sponsorship.</p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-white sm:px-5">
        <ArrowRight className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Regra simples para decidir</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Sem oferta formal elegível, o Plano 2 ainda é uma possibilidade. Se surgir uma boa oferta antes de pagar o curso da Julia, compare salário líquido, cidade, prazo migratório e autorização dela; caso contrário, avance na validação financeira e acadêmica do Plano 1.</p>
        </div>
      </div>
    </section>
  );
}

export function VisaExplorer({ exchangeRate }: { exchangeRate: number }) {
  const formattedRate = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(exchangeRate);

  return (
    <section aria-labelledby="visas-heading" className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5 text-sm text-blue-950">
        <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-blue-700" aria-hidden="true" />
        <div>
          <h2 id="visas-heading" className="font-semibold">Vistos e condições de entrada</h2>
          <p className="mt-1 text-xs leading-5 text-blue-900/80">Valores em reais calculados pela cotação salva em Gastos: € 1 = R$ {formattedRate}. Referência consultada em 07/10/2026. Requisitos e valores em euros podem mudar conforme nacionalidade, consulado, duração e situação familiar. Confirme as fontes oficiais antes de pagar ou viajar. As orientações de turismo consideram passaporte brasileiro comum.</p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CountryColumn country="espanha" exchangeRate={exchangeRate} />
        <CountryColumn country="portugal" exchangeRate={exchangeRate} />
      </div>

      <ExecutionPlanCards exchangeRate={exchangeRate} />
    </section>
  );
}
