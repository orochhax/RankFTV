"use client";

import { useState } from "react";
import { BookOpenCheck, BriefcaseBusiness, ChevronDown, CircleAlert, ExternalLink, GraduationCap, Plane, ShieldAlert } from "lucide-react";
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
    </section>
  );
}
