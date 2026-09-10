"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, CircleDollarSign, MapPin, Search, X } from "lucide-react";
import type { ChampionshipDiscoveryFilters } from "@/lib/championship-discovery";

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
type Panel = "location" | "dates" | "price";

function panelAlignment(alignRight: boolean, mobileAlignRight: boolean) {
  if (mobileAlignRight) return "right-0";
  if (alignRight) return "left-0 md:left-auto md:right-0";
  return "left-0";
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Segment({ icon, title, summary, active, onClick, children, alignRight = false, mobileAlignRight = false }: {
  icon: ReactNode;
  title: string;
  summary: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  alignRight?: boolean;
  mobileAlignRight?: boolean;
}) {
  return <div className="relative min-w-0 flex-1">
    <button type="button" onClick={onClick} aria-expanded={active} className={`flex min-h-[74px] w-full items-center gap-3 rounded-2xl px-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:rounded-none md:px-5 ${active ? "bg-gray-50" : ""}`}>
      <span className="shrink-0 text-gray-950">{icon}</span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{title}</strong>
        <span className="mt-0.5 block truncate text-xs text-gray-500 sm:text-sm">{summary}</span>
      </span>
    </button>
    {active && <div className={`absolute top-[calc(100%+10px)] z-30 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-xl ${panelAlignment(alignRight, mobileAlignRight)}`}>{children}</div>}
  </div>;
}

export function ChampionshipDiscoveryBar({ filters, estados, update, clear, onSearch, collapsibleOnMobile = false }: {
  filters: ChampionshipDiscoveryFilters;
  estados: string[];
  update: (patch: Partial<ChampionshipDiscoveryFilters>) => void;
  clear: () => void;
  onSearch: () => void;
  collapsibleOnMobile?: boolean;
}) {
  const [open, setOpen] = useState<Panel | null>(null);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasFilters = Object.entries(filters).some(([, value]) => value !== "" && value !== false);
  const locationSummary = filters.location || filters.state || filters.query || "Selecione um local";
  const datesSummary = filters.dateFrom || filters.dateTo
    ? [formatDate(filters.dateFrom), formatDate(filters.dateTo)].filter(Boolean).join(" até ")
    : "Dia do evento";
  const priceSummary = filters.maxPrice === "0" ? "Grátis" : filters.maxPrice ? `Até R$ ${filters.maxPrice}` : "Todos os preços";

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggle(panel: Panel) {
    setOpen((current) => current === panel ? null : panel);
  }

  return <div ref={rootRef} className="relative">
    {collapsibleOnMobile ? (
      <button
        type="button"
        onClick={() => { setExpanded((current) => !current); setOpen(null); }}
        aria-expanded={expanded}
        aria-controls="mobile-championship-search"
        className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_3px_16px_rgba(0,0,0,0.12)] ring-1 ring-black/5 md:hidden"
      >
        <Search className="size-5 text-gray-500" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold text-gray-900">Buscar campeonatos</span>
        <ChevronDown className={`size-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    ) : null}
    <div
      id={collapsibleOnMobile ? "mobile-championship-search" : undefined}
      className={`${collapsibleOnMobile && !expanded ? "hidden md:flex" : "grid"} ${collapsibleOnMobile && expanded ? "mt-3" : ""} grid-cols-2 gap-px rounded-[2rem] bg-white p-2 shadow-[0_3px_16px_rgba(0,0,0,0.12)] ring-1 ring-black/5 md:flex md:items-center md:gap-0 md:rounded-full md:p-1.5`}
    >
      <Segment icon={<MapPin className="size-6" strokeWidth={1.8} />} title="Local" summary={locationSummary} active={open === "location"} onClick={() => toggle("location")}>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-700">Cidade ou local<input value={filters.location} onChange={(event) => update({ location: event.target.value })} placeholder="Ex.: Salvador" className={`${inputClass} mt-1`} /></label>
          <label className="block text-xs font-semibold text-gray-700">Estado<select value={filters.state} onChange={(event) => update({ state: event.target.value })} className={`${inputClass} mt-1`}><option value="">Todos os estados</option>{estados.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
          <label className="block text-xs font-semibold text-gray-700">Nome do campeonato <span className="font-normal text-gray-400">(opcional)</span><input value={filters.query} onChange={(event) => update({ query: event.target.value })} placeholder="Buscar pelo nome" className={`${inputClass} mt-1`} /></label>
        </div>
      </Segment>
      <span aria-hidden="true" className="hidden h-10 w-px bg-gray-200 md:block" />
      <Segment icon={<CalendarDays className="size-6" strokeWidth={1.8} />} title="Datas" summary={datesSummary} active={open === "dates"} onClick={() => toggle("dates")} alignRight mobileAlignRight>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-gray-700">De<input type="date" value={filters.dateFrom} onChange={(event) => update({ dateFrom: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="block text-xs font-semibold text-gray-700">Até<input type="date" value={filters.dateTo} onChange={(event) => update({ dateTo: event.target.value })} className={`${inputClass} mt-1`} /></label>
        </div>
      </Segment>
      <span aria-hidden="true" className="hidden h-10 w-px bg-gray-200 md:block" />
      <Segment icon={<CircleDollarSign className="size-6" strokeWidth={1.8} />} title="Preço" summary={priceSummary} active={open === "price"} onClick={() => toggle("price")} alignRight>
        <label className="block text-xs font-semibold text-gray-700">Faixa de preço<select value={filters.maxPrice} onChange={(event) => update({ maxPrice: event.target.value })} className={`${inputClass} mt-1`}><option value="">Todos os preços</option><option value="0">Grátis</option><option value="100">Até R$ 100</option><option value="200">Até R$ 200</option><option value="300">Até R$ 300</option><option value="500">Até R$ 500</option></select></label>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={filters.openOnly} onChange={(event) => update({ openOnly: event.target.checked })} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />Somente inscrições abertas</label>
      </Segment>
      <button type="button" onClick={() => { setOpen(null); onSearch(); }} aria-label="Pesquisar campeonatos" className="col-span-2 m-1 flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:my-0 md:ml-1 md:mr-2 md:size-12 md:shrink-0 md:px-0">
        <Search className="size-6" /><span className="md:sr-only">Pesquisar</span>
      </button>
    </div>
    {hasFilters && <button type="button" onClick={() => { setOpen(null); clear(); }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"><X className="size-3.5" /> Limpar filtros</button>}
  </div>;
}
