"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, Armchair } from "lucide-react";
import { useState, type FormEvent } from "react";

export function CheckinTabs({
  championshipId,
  activeTab,
  totalDuplas,
  totalPlateia,
}: {
  championshipId: string;
  activeTab: "atletas" | "plateia";
  totalDuplas: number;
  totalPlateia: number;
}) {
  return (
    <div className="flex gap-2 border-b border-border pb-3">
      <Link
        href={`/painel/campeonatos/${championshipId}/checkin?tab=atletas`}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
          activeTab === "atletas"
            ? "bg-brand text-white shadow-sm"
            : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <Users className="size-4" />
        Atletas & Duplas
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            activeTab === "atletas" ? "bg-white/20 text-white" : "bg-border text-ink-muted"
          }`}
        >
          {totalDuplas}
        </span>
      </Link>

      <Link
        href={`/painel/campeonatos/${championshipId}/checkin?tab=plateia`}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
          activeTab === "plateia"
            ? "bg-brand text-white shadow-sm"
            : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <Armchair className="size-4" />
        Plateia & Camarotes
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            activeTab === "plateia" ? "bg-white/20 text-white" : "bg-border text-ink-muted"
          }`}
        >
          {totalPlateia}
        </span>
      </Link>
    </div>
  );
}

export function AthleteFilters({
  championshipId,
  categories,
  activeCategory,
  activeStatus,
  activeQuery,
}: {
  championshipId: string;
  categories: Array<{ id: string; nome: string }>;
  activeCategory: string;
  activeStatus: string;
  activeQuery: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(activeQuery);

  function buildUrl(cat: string, status: string, query: string) {
    const params = new URLSearchParams();
    params.set("tab", "atletas");
    if (cat !== "todas") params.set("cat", cat);
    if (status !== "todos") params.set("filtro", status);
    if (query.trim()) params.set("q", query.trim());
    return `/painel/campeonatos/${championshipId}/checkin?${params.toString()}`;
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(buildUrl(activeCategory, activeStatus, search));
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar atleta ou parceiro por nome..."
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.push(buildUrl(activeCategory, activeStatus, ""));
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
          >
            Limpar
          </button>
        )}
      </form>

      {/* Category Filter Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 font-medium text-ink-muted">Categoria:</span>
          <Link
            href={buildUrl("todas", activeStatus, search)}
            className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              activeCategory === "todas"
                ? "bg-brand text-white"
                : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
            }`}
          >
            Todas
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildUrl(c.id, activeStatus, search)}
              className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                activeCategory === c.id
                  ? "bg-brand text-white"
                  : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
              }`}
            >
              {c.nome}
            </Link>
          ))}
        </div>
      )}

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="shrink-0 font-medium text-ink-muted">Status:</span>
        {[
          { key: "todos", label: "Todas as duplas" },
          { key: "pendentes", label: "Pendentes de chegada" },
          { key: "confirmadas", label: "Totalmente confirmadas" },
        ].map((s) => (
          <Link
            key={s.key}
            href={buildUrl(activeCategory, s.key, search)}
            className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              activeStatus === s.key
                ? "bg-brand text-white"
                : "bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
