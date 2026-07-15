"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, CalendarDays, MapPin, Tag, Settings2, Pencil, ExternalLink, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/shell/EmptyState";
import { formatDateRangeBR } from "@/lib/format";
import type { ChampionshipStatus } from "@/lib/types";

export type OrganizerChampSummary = {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  status: ChampionshipStatus;
  categoriasCount: number;
  bannerUrl: string | null;
  bannerFrom: string;
  bannerTo: string;
};

// Busca local (só filtra o que já veio do servidor pro filtro de status
// ativo) por nome/cidade/estado — sem round-trip novo, é instantânea.
export function MeusCampeonatosGrid({ campeonatos }: { campeonatos: OrganizerChampSummary[] }) {
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? campeonatos.filter((c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.cidade.toLowerCase().includes(termo) ||
        c.estado.toLowerCase().includes(termo),
      )
    : campeonatos;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, cidade ou estado..."
          className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum campeonato encontrado"
          description={`Nada bateu com "${busca}". Tente outro termo.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => (
            <OrganizerChampCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrganizerChampCard({ c }: { c: OrganizerChampSummary }) {
  const overviewHref = c.status === "rascunho" ? `/painel/campeonatos/${c.id}/criado` : `/painel/campeonatos/${c.id}`;

  return (
    <div className="overflow-hidden rounded-card-lg bg-surface ring-1 ring-border shadow-soft transition-shadow hover:shadow-elevated">
      <Link href={overviewHref} className={`relative block h-28 bg-gradient-to-br ${c.bannerFrom} ${c.bannerTo}`}>
        {c.bannerUrl ? (
          <Image src={c.bannerUrl} alt={c.nome} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-8 text-white/60" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <StatusBadge status={c.status} />
        </div>
      </Link>

      <div className="p-4">
        <Link href={overviewHref}>
          <h3 className="truncate text-sm font-bold text-ink hover:text-blue-600">{c.nome}</h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" /> {formatDateRangeBR(c.dataInicio, c.dataFim)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> {c.cidade}-{c.estado}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="size-3" /> {c.categoriasCount} {c.categoriasCount === 1 ? "categoria" : "categorias"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
          <Link
            href={overviewHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            <Settings2 className="size-3.5" /> Gerenciar
          </Link>
          <Link
            href={`/painel/campeonatos/${c.id}/editar`}
            title="Editar"
            aria-label="Editar campeonato"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </Link>
          <a
            href={`/campeonatos/${c.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver página pública"
            aria-label="Ver página pública"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
