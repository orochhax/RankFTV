"use client";

import { useState, useTransition } from "react";
import { Search, X, Trophy, RefreshCcw } from "lucide-react";
import { assignTeam, saveScore, clearScore, resetBracket } from "@/app/painel/campeonatos/[id]/chaveamento/actions";
import type { TeamDisplay, MatchDisplay, RoundDisplay } from "@/app/painel/campeonatos/[id]/chaveamento/page";

/* ─── layout constants ─── */
const CARD_H = 73;
const SLOT_H = 81;

function paddingTopFor(ri: number) { return (Math.pow(2, ri) * SLOT_H - CARD_H) / 2; }
function gapFor(ri: number)        { return Math.pow(2, ri) * SLOT_H - CARD_H; }

/* ─── sub-componentes ─── */

function SlotRow({
  team,
  winner,
  bye,
}: {
  team: TeamDisplay | null;
  winner: boolean;
  bye: boolean;
}) {
  if (bye) {
    return (
      <div className="flex h-9 items-center gap-2 bg-gray-50 px-3">
        <div className="size-1.5 rounded-full bg-gray-200" />
        <span className="text-xs italic text-gray-300">BYE</span>
      </div>
    );
  }
  if (!team) {
    return (
      <div className="flex h-9 items-center gap-2 px-3">
        <div className="size-1.5 rounded-full bg-gray-200" />
        <span className="text-xs text-gray-300">A definir</span>
      </div>
    );
  }
  return (
    <div className={`flex h-9 items-center gap-2 px-3 ${winner ? "bg-emerald-50" : ""}`}>
      <div className={`size-1.5 shrink-0 rounded-full ${winner ? "bg-emerald-500" : "bg-blue-400"}`} />
      <span className={`truncate text-xs font-medium ${winner ? "text-emerald-700" : "text-gray-800"}`}>
        {team.nome}
      </span>
      {winner && <Trophy className="ml-auto size-3 shrink-0 text-emerald-400" />}
    </div>
  );
}

function ScorePill({ setsA, setsB }: { setsA: number; setsB: number }) {
  return (
    <div className="flex items-center justify-center gap-1 bg-gray-50 px-3 py-0.5">
      <span className="text-[11px] font-semibold tabular-nums text-gray-500">
        {setsA} × {setsB}
      </span>
    </div>
  );
}

/* ─── modal ─── */

type ModalState = {
  match:      MatchDisplay;
  roundNome:  string;
};

function MatchModal({
  state,
  availableTeams,
  champId,
  catId,
  onClose,
}: {
  state:          ModalState;
  availableTeams: TeamDisplay[];
  champId:        string;
  catId:          string;
  onClose:        () => void;
}) {
  const { match, roundNome } = state;
  const [activeSlot, setActiveSlot] = useState<"a" | "b" | null>(null);
  const [search, setSearch]         = useState("");
  const [setsA, setSetsA]           = useState(match.setsA?.toString() ?? "");
  const [setsB, setSetsB]           = useState(match.setsB?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  const filteredTeams = availableTeams.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const canSaveScore = !!match.teamA && !!match.teamB && setsA !== "" && setsB !== "";

  function handleAssign(team: TeamDisplay) {
    if (!activeSlot) return;
    const slot = activeSlot;
    setActiveSlot(null);
    setSearch("");
    startTransition(async () => {
      await assignTeam(match.dbId, slot, team.id, champId);
      onClose();
    });
  }

  function handleSaveScore() {
    const sa = parseInt(setsA);
    const sb = parseInt(setsB);
    if (isNaN(sa) || isNaN(sb)) return;
    startTransition(async () => {
      await saveScore(
        match.dbId, sa, sb,
        match.teamA?.id ?? null,
        match.teamB?.id ?? null,
        champId, catId,
        match.roundIndex, match.matchIndex,
      );
      onClose();
    });
  }

  function handleClearScore() {
    startTransition(async () => {
      await clearScore(match.dbId, champId);
      onClose();
    });
  }

  /* ── modo busca ── */
  if (activeSlot) {
    return (
      <ModalShell onClose={() => { setActiveSlot(null); setSearch(""); }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Escolher {activeSlot === "a" ? "Dupla A" : "Dupla B"}
          </p>
          <button onClick={() => { setActiveSlot(null); setSearch(""); }}
            className="rounded-lg p-1 hover:bg-gray-100">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar dupla..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
          {filteredTeams.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-gray-400">
              Nenhuma dupla encontrada.
            </li>
          ) : (
            filteredTeams.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => handleAssign(t)}
                  disabled={isPending}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="size-1.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium text-gray-800">{t.nome}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </ModalShell>
    );
  }

  /* ── modo edição do confronto ── */
  return (
    <ModalShell onClose={onClose}>
      {/* título */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {roundNome}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">
            Confronto {match.matchIndex + 1}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
          <X className="size-4 text-gray-500" />
        </button>
      </div>

      {/* slots + placar */}
      <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/8">
        {/* Dupla A */}
        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <div className={`size-2 shrink-0 rounded-full ${match.teamA ? "bg-blue-400" : "bg-gray-200"}`} />
          <span className={`flex-1 text-sm font-medium ${match.teamA ? "text-gray-900" : "text-gray-300"}`}>
            {match.teamA?.nome ?? "A definir"}
          </span>
          <button
            onClick={() => setActiveSlot("a")}
            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {match.teamA ? "Alterar" : "Definir"}
          </button>
        </div>

        {/* placar */}
        <div className="flex items-center gap-2 border-y border-gray-100 bg-gray-50 px-4 py-2.5">
          <span className="text-xs text-gray-500">Sets:</span>
          <input
            type="number"
            min={0}
            max={9}
            value={setsA}
            onChange={(e) => setSetsA(e.target.value)}
            className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="—"
          />
          <span className="text-sm font-semibold text-gray-400">×</span>
          <input
            type="number"
            min={0}
            max={9}
            value={setsB}
            onChange={(e) => setSetsB(e.target.value)}
            className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="—"
          />
          {match.setsA !== null && match.setsB !== null && (
            <button
              onClick={handleClearScore}
              disabled={isPending}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Dupla B */}
        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <div className={`size-2 shrink-0 rounded-full ${match.teamB ? "bg-blue-400" : "bg-gray-200"}`} />
          <span className={`flex-1 text-sm font-medium ${match.teamB ? "text-gray-900" : "text-gray-300"}`}>
            {match.teamB?.nome ?? "A definir"}
          </span>
          <button
            onClick={() => setActiveSlot("b")}
            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {match.teamB ? "Alterar" : "Definir"}
          </button>
        </div>
      </div>

      {/* ações */}
      <button
        onClick={handleSaveScore}
        disabled={!canSaveScore || isPending}
        className="mt-4 w-full rounded-2xl bg-gray-900 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30 hover:bg-gray-800"
      >
        {isPending ? "Salvando…" : "Salvar placar"}
      </button>

      {!match.teamA && !match.teamB && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Defina as duas duplas para lançar o placar.
        </p>
      )}
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

/* ─── componente principal ─── */

export function BracketClient({
  champId,
  catId,
  rounds,
  availableTeams,
}: {
  champId:        string;
  catId:          string;
  rounds:         RoundDisplay[];
  availableTeams: TeamDisplay[];
}) {
  const [modalState, setModalState]   = useState<ModalState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isPending, startTransition]  = useTransition();

  function openModal(match: MatchDisplay, roundNome: string) {
    setModalState({ match, roundNome });
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    startTransition(async () => {
      await resetBracket(champId, catId);
    });
  }

  return (
    <>
      {/* bracket */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-8" style={{ minWidth: "max-content" }}>
          {rounds.map((round) => {
            const ri = round.roundIndex;
            const pt = paddingTopFor(ri);

            return (
              <div key={ri} className="relative flex flex-col">
                {/* label posicionado acima do primeiro card */}
                <div
                  className="absolute left-0 right-0 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  style={{ top: `${Math.max(0, pt - 22)}px` }}
                >
                  {round.nome}
                </div>

                {/* cards */}
                <div
                  className="flex flex-col"
                  style={{ paddingTop: `${pt}px`, gap: `${gapFor(ri)}px` }}
                >
                  {round.matches.map((match) => {
                    const byeA = !match.teamA && !!match.teamB;
                    const byeB = !match.teamB && !!match.teamA;
                    const isTBD = !match.teamA && !match.teamB;
                    const hasScore = match.setsA !== null && match.setsB !== null;

                    return (
                      <button
                        key={match.dbId}
                        onClick={() => openModal(match, round.nome)}
                        className={`w-52 overflow-hidden rounded-xl text-left transition-all ${
                          isTBD
                            ? "bg-gray-50 ring-1 ring-black/5 hover:ring-gray-300"
                            : "bg-white shadow-sm ring-1 ring-black/10 hover:shadow-md hover:ring-blue-400"
                        }`}
                      >
                        <SlotRow
                          team={match.teamA}
                          winner={match.winnerId === match.teamA?.id}
                          bye={byeA}
                        />
                        {hasScore && (
                          <ScorePill setsA={match.setsA!} setsB={match.setsB!} />
                        )}
                        <div className="h-px bg-gray-100" />
                        <SlotRow
                          team={match.teamB}
                          winner={match.winnerId === match.teamB?.id}
                          bye={byeB}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* rodapé */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Clique em qualquer confronto para editar duplas ou lançar placar.
        </p>
        <button
          onClick={handleReset}
          disabled={isPending}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            confirmReset
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <RefreshCcw className="size-3.5" />
          {confirmReset ? "Confirmar reset?" : "Reiniciar chaveamento"}
        </button>
      </div>

      {/* modal */}
      {modalState && (
        <MatchModal
          state={modalState}
          availableTeams={availableTeams}
          champId={champId}
          catId={catId}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}
