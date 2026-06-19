"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Send, X, CalendarDays, MapPin, Clock } from "lucide-react";
import {
  searchChampionshipsForLink,
  sendPageChampionshipInvite,
} from "@/app/campeonatos/paginas/actions";

type ChampResult = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  organizador_id: string;
};

type EtapaChamp = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  status: string;
};

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pickEtapaAtual(champs: EtapaChamp[]): EtapaChamp | null {
  if (champs.length === 0) return null;
  const today = new Date().toISOString().split("T")[0];
  const upcoming = champs
    .filter((c) => c.data_inicio >= today)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  if (upcoming.length > 0) return upcoming[0];
  return [...champs].sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))[0];
}

const STATUS_LABEL: Record<string, string> = {
  inscricoes_abertas: "Inscrições abertas",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};
const STATUS_COLOR: Record<string, string> = {
  inscricoes_abertas: "text-green-600 bg-green-50",
  em_andamento: "text-blue-600 bg-blue-50",
  encerrado: "text-gray-500 bg-gray-100",
};

export function EtapaAtualCard({
  pageId,
  isOwner,
  linkedChampionships,
}: {
  pageId: string;
  isOwner: boolean;
  linkedChampionships: EtapaChamp[];
}) {
  const etapa = pickEtapaAtual(linkedChampionships);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChampResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [sending, startSend] = useTransition();
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const r = await searchChampionshipsForLink(query, pageId);
        setResults(r);
      });
    }, 350);
  }, [query, pageId]);

  function handleSend(champId: string) {
    setError("");
    startSend(async () => {
      const res = await sendPageChampionshipInvite(pageId, champId);
      if (res.ok) {
        setSentId(champId);
        setQuery("");
        setResults([]);
        setShowSearch(false);
      } else {
        setError(res.error ?? "Erro ao enviar.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays className="size-4 text-blue-500" />
          Etapa Atual
        </h2>
        {isOwner && !showSearch && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Search className="size-3.5" />
            Vincular campeonato
          </button>
        )}
        {isOwner && showSearch && (
          <button
            type="button"
            onClick={() => { setShowSearch(false); setQuery(""); setResults([]); setError(""); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Search (owner only) */}
      {isOwner && showSearch && (
        <div className="px-5 pb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar campeonato pelo nome…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {sentId && (
            <p className="text-xs text-green-600">Convite enviado! Aguardando o dono do campeonato aceitar.</p>
          )}
          {searching && <p className="text-xs text-gray-400">Buscando…</p>}
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-400">
                      {c.cidade} · {formatDate(c.data_inicio)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend(c.id)}
                    disabled={sending || sentId === c.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="size-3" />
                    {sentId === c.id ? "Enviado" : "Convidar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-xs text-gray-400">Nenhum campeonato encontrado.</p>
          )}
        </div>
      )}

      {/* Etapa atual */}
      {etapa ? (
        <Link
          href={`/campeonatos/${etapa.id}`}
          className="flex items-center justify-between gap-3 border-t border-gray-50 px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{etapa.nome}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDate(etapa.data_inicio)}
                {etapa.data_fim !== etapa.data_inicio && ` → ${formatDate(etapa.data_fim)}`}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {etapa.cidade}, {etapa.estado}
              </span>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[etapa.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABEL[etapa.status] ?? etapa.status}
          </span>
        </Link>
      ) : (
        <div className="border-t border-gray-50 px-5 py-5 text-center">
          <Clock className="mx-auto mb-2 size-8 text-gray-200" />
          <p className="text-sm text-gray-400">
            {isOwner
              ? "Nenhuma etapa vinculada ainda. Use o botão acima para buscar e convidar."
              : "Nenhuma etapa agendada no momento."}
          </p>
        </div>
      )}
    </div>
  );
}
