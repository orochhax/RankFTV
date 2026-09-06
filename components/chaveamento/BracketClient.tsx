"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Trophy, RefreshCcw, Shuffle, ChevronDown, ImageIcon, FileText, AlignLeft, Lock, CheckCircle2, Share2 } from "lucide-react";
import { addManualBracketPair, assignTeam, saveScore, clearScore, resetBracket, generateBracket, confirmBracket, saveCourtConfiguration, changeMatchCourt } from "@/app/painel/campeonatos/[id]/chaveamento/actions";
import { formatDateTimeBR } from "@/lib/format";
import type { CourtConfiguration } from "@/lib/bracket-courts";
import { doubleEliminationCountError, type BracketFormat } from "@/lib/double-elimination";
import { validateBracketScore } from "@/lib/bracket-score";
import { BracketGrid, MatchCard } from "@/components/chaveamento/BracketView";
import type { BracketMatch, BracketRound } from "@/lib/types";
import type { TeamDisplay, MatchDisplay, RoundDisplay, SetDetail } from "@/app/painel/campeonatos/[id]/chaveamento/page";

function splitTeamName(name: string | undefined): [string, string] {
  if (!name) return ["A definir", ""];
  const parts = name.split(" & ");
  return [parts[0] ?? name, parts[1] ?? ""];
}

function toSharedMatch(match: MatchDisplay): BracketMatch {
  return {
    id: match.dbId,
    numero: match.numero,
    duplaA: { nomes: splitTeamName(match.teamA?.nome) },
    duplaB: { nomes: splitTeamName(match.teamB?.nome) },
    placar: match.setsA !== null && match.setsB !== null ? `${match.setsA} × ${match.setsB}` : undefined,
    sets: match.setDetails ?? undefined,
    quadra: match.courtLabel ? `Quadra ${match.courtLabel}` : undefined,
    winner: match.winnerId === match.teamA?.id ? "a" : match.winnerId === match.teamB?.id ? "b" : null,
  };
}

function toSharedRounds(rounds: RoundDisplay[]): BracketRound[] {
  return rounds.map((round) => ({
    nome: round.nome,
    matches: round.matches.map(toSharedMatch),
  }));
}

/* ─── sorteio ─── */

function SorteioPanel({
  availableTeams,
  hasExistingBracket,
  champId,
  catId,
  courtConfiguration,
  bracketFormat,
  hasResults,
}: {
  availableTeams:    TeamDisplay[];
  hasExistingBracket: boolean;
  champId:           string;
  catId:             string;
  courtConfiguration?: CourtConfiguration;
  bracketFormat: BracketFormat;
  hasResults: boolean;
}) {
  const router = useRouter();
  const [open, setOpen]       = useState(!hasExistingBracket);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(availableTeams.map((t) => t.id)),
  );
  const [confirm, setConfirm]     = useState(false);
  const [athleteA, setAthleteA] = useState("");
  const [athleteB, setAthleteB] = useState("");
  const [pairError, setPairError] = useState<string | null>(null);
  const [courtError, setCourtError] = useState<string | null>(null);
  const [courtSaved, setCourtSaved] = useState(false);
  const [totalCourts, setTotalCourts] = useState(courtConfiguration?.totalCourts ?? 1);
  const [primaryCourtNumber, setPrimaryCourtNumber] = useState(courtConfiguration?.primaryCourtNumber ?? 1);
  const [selectedFormat, setSelectedFormat] = useState<BracketFormat>(bracketFormat);
  const [isPending, startTransition] = useTransition();

  const allSelected  = selected.size === availableTeams.length;
  const noneSelected = selected.size === 0;
  const countError = selectedFormat === "double_elimination"
    ? doubleEliminationCountError(selected.size)
    : null;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(availableTeams.map((t) => t.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    if (hasExistingBracket && !confirm) { setConfirm(true); return; }
    setConfirm(false);
    setCourtError(null);
    startTransition(async () => {
      const result = await generateBracket(champId, catId, Array.from(selected), {
        totalCourts,
        primaryCourtNumber,
      }, selectedFormat);
      if (!result?.ok) {
        setCourtError(result?.error ?? "Não foi possível gerar o chaveamento.");
        return;
      }
      router.refresh();
    });
  }

  function handleSaveCourts() {
    setCourtError(null);
    setCourtSaved(false);
    startTransition(async () => {
      const result = await saveCourtConfiguration(champId, {
        totalCourts,
        primaryCourtNumber,
      });
      if (!result.ok) {
        setCourtError(result.error ?? "Não foi possível salvar as quadras.");
        return;
      }
      setCourtSaved(true);
      router.refresh();
    });
  }

  function handleAddPair() {
    setPairError(null);
    startTransition(async () => {
      const result = await addManualBracketPair(champId, catId, athleteA, athleteB);
      if (!result.ok) {
        setPairError(result.error ?? "Não foi possível adicionar a dupla.");
        return;
      }
      setAthleteA("");
      setAthleteB("");
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* cabeçalho clicável */}
      <button
        onClick={() => { setOpen((o) => !o); setConfirm(false); }}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Shuffle className="size-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Sorteio do chaveamento</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            {availableTeams.length} duplas
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-5 pb-5 pt-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Formato do chaveamento</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-3 ${selectedFormat === "single_elimination" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                <input type="radio" className="mr-2 accent-blue-600" checked={selectedFormat === "single_elimination"} disabled={hasResults} onChange={() => setSelectedFormat("single_elimination")} />
                <span className="text-sm font-semibold text-gray-900">Eliminatória simples</span>
                <span className="mt-1 block pl-5 text-xs text-gray-500">Uma derrota elimina; semifinalistas disputam o 3º lugar.</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-3 ${selectedFormat === "double_elimination" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                <input type="radio" className="mr-2 accent-blue-600" checked={selectedFormat === "double_elimination"} disabled={hasResults} onChange={() => setSelectedFormat("double_elimination")} />
                <span className="text-sm font-semibold text-gray-900">Repescagem</span>
                <span className="mt-1 block pl-5 text-xs text-gray-500">A primeira derrota leva à repescagem; duas duplas retornam às semifinais.</span>
              </label>
            </div>
            {hasResults && <p className="mt-2 text-xs font-medium text-amber-600">O formato está bloqueado porque já existem resultados. Limpe o chaveamento para trocar.</p>}
          </div>

          {courtConfiguration && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Quadras do campeonato</p>
                <p className="mt-0.5 text-xs text-gray-500">O sistema distribui os jogos automaticamente e reserva a principal para as decisões.</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Total de quadras</span>
                  <input type="number" min={1} max={32} value={totalCourts} onChange={(event) => {
                    const next = Math.max(1, Math.min(32, Number(event.target.value) || 1));
                    setTotalCourts(next);
                    setPrimaryCourtNumber((current) => Math.min(current, next));
                    setCourtSaved(false);
                  }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Quadra principal</span>
                  <select value={primaryCourtNumber} onChange={(event) => {
                    setPrimaryCourtNumber(Number(event.target.value));
                    setCourtSaved(false);
                  }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                    {Array.from({ length: totalCourts }, (_, index) => index + 1).map((court) => (
                      <option key={court} value={court}>Quadra {court}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={handleSaveCourts} disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                  {isPending ? "Salvando…" : "Salvar configuração"}
                </button>
                {courtSaved && <span className="text-xs font-medium text-emerald-600">Configuração salva e jogos redistribuídos.</span>}
              </div>
              {courtError && <p className="mt-2 text-xs font-medium text-red-600">{courtError}</p>}
            </div>
          )}

          <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
            <p className="text-xs font-semibold text-blue-900">Adicionar dupla ao sorteio</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={athleteA} onChange={(event) => setAthleteA(event.target.value)} placeholder="Nome do atleta 1" className="min-w-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <input value={athleteB} onChange={(event) => setAthleteB(event.target.value)} placeholder="Nome do atleta 2" className="min-w-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <button type="button" onClick={handleAddPair} disabled={isPending || !athleteA.trim() || !athleteB.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Adicionar</button>
            </div>
            {pairError && <p className="mt-2 text-xs font-medium text-red-600">{pairError}</p>}
          </div>

          {/* selecionar todas */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {selected.size} de {availableTeams.length} selecionadas
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {allSelected ? "Limpar seleção" : "Selecionar todas"}
            </button>
          </div>

          {/* lista de duplas */}
          <ul className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-gray-100 p-1">
            {availableTeams.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="size-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-800">{t.nome}</span>
                </label>
              </li>
            ))}
          </ul>

          {countError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {countError}
            </p>
          )}

          {/* aviso se já existe bracket */}
          {hasExistingBracket && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Isso vai apagar o chaveamento atual e criar um novo com as duplas selecionadas.
            </p>
          )}

          {/* botão gerar */}
          <button
            onClick={handleGenerate}
            disabled={noneSelected || isPending || !!countError}
            className={`w-full rounded-2xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-30 ${
              confirm
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-900 hover:bg-gray-800"
            }`}
          >
            {isPending
              ? "Gerando…"
              : confirm
              ? "Confirmar? Isso apaga o chaveamento atual"
              : `Gerar chaveamento aleatório (${selected.size} duplas)`}
          </button>
        </div>
      )}
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
  totalCourts,
  onClose,
}: {
  state:          ModalState;
  availableTeams: TeamDisplay[];
  champId:        string;
  catId:          string;
  totalCourts?:   number;
  onClose:        () => void;
}) {
  const router = useRouter();
  const { match, roundNome } = state;
  const [activeSlot, setActiveSlot] = useState<"a" | "b" | null>(null);
  const [search, setSearch]         = useState("");
  const [setsA, setSetsA]           = useState(match.setsA?.toString() ?? "");
  const [setsB, setSetsB]           = useState(match.setsB?.toString() ?? "");
  const [setDetails, setSetDetails] = useState<Array<{ a: string; b: string }>>(() =>
    match.setDetails?.map((s: SetDetail) => ({ a: s.a.toString(), b: s.b.toString() })) ?? [],
  );
  const [selectedCourt, setSelectedCourt] = useState(Number(match.courtLabel) || 1);
  const [courtError, setCourtError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sa = parseInt(setsA);
  const sb = parseInt(setsB);
  const totalSets = (isNaN(sa) ? 0 : sa) + (isNaN(sb) ? 0 : sb);

  const filteredTeams = availableTeams.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const canSaveScore = !!match.teamA && !!match.teamB && setsA !== "" && setsB !== "";

  function updateSetDetail(idx: number, field: "a" | "b", val: string) {
    setScoreError(null);
    setSetDetails((prev) => {
      const next = [...prev];
      while (next.length <= idx) next.push({ a: "", b: "" });
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

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
    if (isNaN(sa) || isNaN(sb)) return;
    setCourtError(null);
    setScoreError(null);
    const rawDetails = Array.from({ length: totalSets }, (_, i) => ({
      a: setDetails[i]?.a?.trim() ?? "",
      b: setDetails[i]?.b?.trim() ?? "",
    }));
    const firstIncompleteSet = rawDetails.findIndex((set) => set.a === "" || set.b === "");
    if (firstIncompleteSet >= 0) {
      setScoreError(`Preencha os pontos das duas duplas no set ${firstIncompleteSet + 1}.`);
      return;
    }
    const details = rawDetails.map((set) => ({ a: Number(set.a), b: Number(set.b) }));
    const validationError = validateBracketScore(sa, sb, details);
    if (validationError) {
      setScoreError(validationError);
      return;
    }
    startTransition(async () => {
      if (totalCourts) {
        const courtResult = await changeMatchCourt(match.dbId, champId, selectedCourt);
        if (!courtResult.ok) {
          setCourtError(courtResult.error ?? "Não foi possível alterar a quadra.");
          return;
        }
      }
      const scoreResult = await saveScore(
        match.dbId, sa, sb,
        match.teamA?.id ?? null,
        match.teamB?.id ?? null,
        champId, catId,
        match.roundIndex, match.matchIndex,
        details,
      );
      if (scoreResult && !scoreResult.ok) {
        setScoreError(scoreResult.error ?? "Não foi possível salvar o placar.");
        return;
      }
      onClose();
    });
  }

  function handleSaveCourt() {
    setCourtError(null);
    startTransition(async () => {
      const result = await changeMatchCourt(match.dbId, champId, selectedCourt);
      if (!result.ok) {
        setCourtError(result.error ?? "Não foi possível alterar a quadra.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function handleClearScore() {
    setCourtError(null);
    startTransition(async () => {
      const result = await clearScore(match.dbId, champId);
      if (result && !result.ok) {
        setCourtError(result.error ?? "Não foi possível limpar o placar.");
        return;
      }
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
            Jogo #{match.numero}{match.courtLabel ? ` · Quadra ${match.courtLabel}` : ""}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
          <X className="size-4 text-gray-500" />
        </button>
      </div>

      {totalCourts && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <label className="block text-xs font-semibold text-blue-900" htmlFor={`court-${match.dbId}`}>
            Quadra deste jogo
          </label>
          <div className="mt-2 flex gap-2">
            <select
              id={`court-${match.dbId}`}
              value={selectedCourt}
              onChange={(event) => { setSelectedCourt(Number(event.target.value)); setCourtError(null); }}
              className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {Array.from({ length: totalCourts }, (_, index) => index + 1).map((court) => (
                <option key={court} value={court}>Quadra {court}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveCourt}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {isPending ? "Salvando…" : "Salvar quadra"}
            </button>
          </div>
          {courtError && <p className="mt-2 text-xs font-medium text-red-600">{courtError}</p>}
        </div>
      )}

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
            onChange={(e) => { setSetsA(e.target.value); setScoreError(null); }}
            className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="—"
          />
          <span className="text-sm font-semibold text-gray-400">×</span>
          <input
            type="number"
            min={0}
            max={9}
            value={setsB}
            onChange={(e) => { setSetsB(e.target.value); setScoreError(null); }}
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

        {/* pontos por set */}
        {totalSets > 0 && (
          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Pontos por set
            </p>
            <div className="space-y-2">
              {Array.from({ length: totalSets }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs text-gray-500">Set {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    value={setDetails[i]?.a ?? ""}
                    onChange={(e) => updateSetDetail(i, "a", e.target.value)}
                    className="w-14 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-center text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="0"
                  />
                  <span className="text-xs font-semibold text-gray-400">×</span>
                  <input
                    type="number"
                    min={0}
                    value={setDetails[i]?.b ?? ""}
                    onChange={(e) => updateSetDetail(i, "b", e.target.value)}
                    className="w-14 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-center text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
      {scoreError && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {scoreError}
        </p>
      )}
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

type Podium = {
  first:  TeamDisplay;
  second: TeamDisplay;
  thirds: TeamDisplay[];
  fourth: TeamDisplay | null;
};

function computePodium(
  rounds: RoundDisplay[],
  thirdPlaceMatch: MatchDisplay | null,
): Podium | null {
  if (rounds.length === 0) return null;
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound.matches[0];
  if (!finalMatch?.winnerId || !finalMatch.teamA || !finalMatch.teamB) return null;

  const first  = finalMatch.winnerId === finalMatch.teamA.id ? finalMatch.teamA : finalMatch.teamB;
  const second = finalMatch.winnerId === finalMatch.teamA.id ? finalMatch.teamB : finalMatch.teamA;

  const thirds: TeamDisplay[] = [];
  let fourth: TeamDisplay | null = null;

  if (thirdPlaceMatch?.winnerId && thirdPlaceMatch.teamA && thirdPlaceMatch.teamB) {
    const thirdWinner = thirdPlaceMatch.winnerId === thirdPlaceMatch.teamA.id
      ? thirdPlaceMatch.teamA
      : thirdPlaceMatch.teamB;
    const thirdLoser = thirdPlaceMatch.winnerId === thirdPlaceMatch.teamA.id
      ? thirdPlaceMatch.teamB
      : thirdPlaceMatch.teamA;
    thirds.push(thirdWinner);
    fourth = thirdLoser;
  } else if (rounds.length >= 2) {
    // Fallback: semifinalistas perdedores (3º lugar empatado)
    const semiRound = rounds[rounds.length - 2];
    for (const m of semiRound.matches) {
      if (m.winnerId && m.teamA && m.teamB) {
        thirds.push(m.winnerId === m.teamA.id ? m.teamB : m.teamA);
      }
    }
  }

  return { first, second, thirds, fourth };
}

function FinalResultsPanel({ podium }: { podium: Podium | null }) {
  const first = podium?.first ?? null;
  const second = podium?.second ?? null;
  const third = podium?.thirds[0] ?? null;
  const results = [
    { position: "1º", label: "Campeões", team: first, style: "border-amber-300 bg-amber-50 text-amber-700" },
    { position: "2º", label: "Vice-campeões", team: second, style: "border-slate-300 bg-slate-50 text-slate-600" },
    { position: "3º", label: "Terceiro lugar", team: third, style: "border-orange-300 bg-orange-50 text-orange-700" },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="size-5 text-blue-600" />
        <div>
          <h2 className="text-sm font-bold text-gray-900">Resultado final</h2>
          <p className="text-[11px] text-gray-400">O pódio é atualizado automaticamente</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {results.map((result) => (
          <div key={result.position} className={`rounded-xl border p-3 ${result.style}`}>
            <div className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-black shadow-sm">{result.position}</span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{result.label}</p>
                <p className={`truncate text-xs font-bold ${result.team ? "text-gray-900" : "opacity-60"}`}>
                  {result.team?.nome ?? "A definir"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BracketClient({
  champId,
  catId,
  rounds,
  availableTeams,
  confirmedAt,
  thirdPlaceMatch,
  canConfirm = true,
  courtConfiguration,
  bracketFormat = "single_elimination",
  hasResults = false,
  loserRounds = [],
}: {
  champId:          string;
  catId:            string;
  rounds:           RoundDisplay[];
  availableTeams:   TeamDisplay[];
  confirmedAt:      string | null;
  thirdPlaceMatch:  MatchDisplay | null;
  canConfirm?:      boolean;
  courtConfiguration?: CourtConfiguration;
  bracketFormat?: BracketFormat;
  hasResults?: boolean;
  loserRounds?: RoundDisplay[];
}) {
  const [modalState, setModalState]         = useState<ModalState | null>(null);
  const [confirmReset, setConfirmReset]     = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmError, setConfirmError]     = useState<string | null>(null);
  const [exporting, setExporting]           = useState<"image" | "pdf" | "text" | "instagram" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();

  const isConfirmed = !!confirmedAt;
  const podium = computePodium(rounds, thirdPlaceMatch);

  function openModal(match: MatchDisplay, roundNome: string) {
    if (isConfirmed) return; // read-only quando confirmado
    setModalState({ match, roundNome });
  }

  function handleConfirm() {
    setConfirmError(null);
    startTransition(async () => {
      const res = await confirmBracket(champId, catId);
      if (!res.ok) {
        setConfirmError(res.error ?? "Erro ao confirmar.");
      } else {
        setShowConfirmModal(false);
      }
    });
  }

  async function exportAsImage() {
    setExportError(null);
    setExporting("image");
    try {
      const { drawBracket } = await import("@/components/chaveamento/drawBracket");
      const { dataUrl } = drawBracket(rounds, thirdPlaceMatch, { loserRounds });
      const a = document.createElement("a");
      a.download = "chaveamento.png";
      a.href = dataUrl;
      a.click();
    } catch {
      setExportError("Não foi possível gerar o PNG. Tente novamente ou exporte em PDF.");
    } finally {
      setExporting(null);
    }
  }

  async function exportAsPdf() {
    setExportError(null);
    setExporting("pdf");
    try {
      const [{ createBracketPdf }, { createBracketExportScene }] = await Promise.all([
        import("@/components/chaveamento/drawBracket"),
        import("@/lib/bracket-export"),
      ]);
      const pdf = await createBracketPdf(createBracketExportScene(rounds, thirdPlaceMatch, { loserRounds }));
      pdf.save("chaveamento.pdf");
    } catch {
      setExportError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  function exportAsText() {
    setExporting("text");
    const lines: string[] = [];
    lines.push("CHAVEAMENTO");
    lines.push("=".repeat(50));

    for (const round of [...rounds, ...loserRounds, ...(thirdPlaceMatch ? [{ nome: "Disputa de 3º lugar", matches: [thirdPlaceMatch] }] : [])]) {
      lines.push("");
      lines.push(round.nome.toUpperCase());
      lines.push("-".repeat(30));
      round.matches.forEach((match) => {
        const a = match.teamA?.nome ?? "A definir";
        const b = match.teamB?.nome ?? "A definir";
        let line = `Jogo #${match.numero} · Quadra ${match.courtLabel ?? "a definir"}: ${a} vs ${b}`;
        if (match.setDetails?.length) line += ` · Sets: ${match.setDetails.map((set) => `${set.a} × ${set.b}`).join(" / ")}`;
        if (match.setsA !== null && match.setsB !== null) {
          line += `  [${match.setsA} x ${match.setsB}]`;
        }
        if (match.winnerId) {
          const winner =
            match.teamA?.id === match.winnerId
              ? match.teamA?.nome
              : match.teamB?.nome;
          line += `  -> Vencedor: ${winner}`;
        }
        lines.push(line);
      });
    }

    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound?.matches[0];
    if (finalMatch?.winnerId) {
      const champion =
        finalMatch.teamA?.id === finalMatch.winnerId
          ? finalMatch.teamA?.nome
          : finalMatch.teamB?.nome;
      lines.push("");
      lines.push("=".repeat(50));
      lines.push(`CAMPEAO: ${champion}`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.download = "chaveamento.txt";
    a.href     = url;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  async function exportAsInstagram() {
    setExportError(null);
    setExporting("instagram");
    try {
      const { drawBracket } = await import("@/components/chaveamento/drawBracket");
      const { dataUrl: bracketUrl } = drawBracket(rounds, thirdPlaceMatch, { loserRounds });

      // Carrega o bracket como imagem para redimensionar
      const bracketImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Falha ao gerar imagem"));
        img.src = bracketUrl;
      });

      // Canvas 1080×1920 (9:16 Stories)
      const canvas = document.createElement("canvas");
      canvas.width  = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;

      // Fundo
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 1080, 1920);

      // Bracket escalado para caber com padding
      const PAD        = 64;
      const BRAND_H    = 80;
      const availW     = 1080 - PAD * 2;
      const availH     = 1920 - PAD * 2 - BRAND_H;
      const scale      = Math.min(availW / bracketImg.width, availH / bracketImg.height);
      const drawW      = bracketImg.width  * scale;
      const drawH      = bracketImg.height * scale;
      const offsetX    = (1080 - drawW) / 2;
      const offsetY    = PAD + (availH - drawH) / 2;

      ctx.drawImage(bracketImg, offsetX, offsetY, drawW, drawH);

      // Linha divisória branding
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, 1920 - BRAND_H);
      ctx.lineTo(1080 - PAD, 1920 - BRAND_H);
      ctx.stroke();

      // "RankFTV" canto inferior direito
      ctx.font         = "bold 36px system-ui, -apple-system, sans-serif";
      ctx.fillStyle    = "#0000ff";
      ctx.textAlign    = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("RankFTV", 1080 - PAD, 1920 - 24);

      const a    = document.createElement("a");
      a.download = "chaveamento-instagram.png";
      a.href     = canvas.toDataURL("image/png");
      a.click();
    } catch {
      setExportError("Não foi possível gerar a imagem para Instagram. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    startTransition(async () => {
      await resetBracket(champId, catId);
    });
  }

  const hasExistingBracket = rounds.length > 0;
  const sharedRounds = toSharedRounds(rounds);
  const sharedLoserRounds = toSharedRounds(loserRounds);
  const editableMatchesById = new Map(
    [...rounds, ...loserRounds].flatMap((round) => round.matches).map((match) => [match.dbId, match]),
  );

  function openSharedMatch(match: BracketMatch, round: BracketRound) {
    const editableMatch = editableMatchesById.get(match.id);
    if (editableMatch) openModal(editableMatch, round.nome);
  }

  return (
    <>
      {/* Modal de confirmação de resultado */}
      {showConfirmModal && podium && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Trophy className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Confirmar resultado final</p>
                <p className="text-xs text-gray-500">Revise o pódio antes de confirmar</p>
              </div>
            </div>

            {/* Pódio */}
            <div className="mb-4 space-y-2 rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🥇</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">1º lugar</p>
                  <p className="text-sm font-semibold text-gray-900">{podium.first.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🥈</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">2º lugar</p>
                  <p className="text-sm font-medium text-gray-800">{podium.second.nome}</p>
                </div>
              </div>
              {podium.thirds.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xl">🥉</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      3º lugar{podium.thirds.length > 1 ? ` (dupla ${i + 1})` : ""}
                    </p>
                    <p className="text-sm font-medium text-gray-800">{t.nome}</p>
                  </div>
                </div>
              ))}
              {podium.fourth && (
                <div className="flex items-center gap-3 pl-9">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">4º lugar</p>
                    <p className="text-sm font-medium text-gray-800">{podium.fourth.nome}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <strong>Atenção:</strong> após confirmar, o chaveamento fica bloqueado e não poderá ser mais editado. Essa ação é irreversível.
            </div>

            {confirmError && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{confirmError}</p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full rounded-2xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Confirmando…" : "Sim, confirmar resultado"}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isPending}
                className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de resultado confirmado */}
      {isConfirmed && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Resultado confirmado</p>
            <p className="text-xs text-blue-600">Confirmado em {formatDateTimeBR(confirmedAt!)} · Somente visualização</p>
          </div>
        </div>
      )}

      {hasExistingBracket && <FinalResultsPanel podium={podium} />}

      {/* sorteio — oculto após confirmação */}
      {!isConfirmed && (
        <SorteioPanel
          availableTeams={availableTeams}
          hasExistingBracket={hasExistingBracket}
          champId={champId}
          catId={catId}
          courtConfiguration={courtConfiguration}
          bracketFormat={bracketFormat}
          hasResults={hasResults}
        />
      )}

      {/* Mesma apresentação da página pública; no painel os cards abrem a edição. */}
      {hasExistingBracket && (
        <div className="overflow-hidden rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
          {bracketFormat === "double_elimination" && (
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-700">Chave principal</p>
          )}
          <BracketGrid rounds={sharedRounds} onMatchClick={openSharedMatch} disabled={isConfirmed} />
        </div>
      )}

      {bracketFormat === "double_elimination" && loserRounds.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Chave de repescagem</p>
            <p className="text-[11px] text-gray-500">A segunda derrota elimina a dupla.</p>
          </div>
          <BracketGrid rounds={sharedLoserRounds} onMatchClick={openSharedMatch} disabled={isConfirmed} />
        </div>
      )}

      {/* Partida pelo 3º lugar */}
      {thirdPlaceMatch && (
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-400">Disputa de 3° Lugar</p>
          <MatchCard
            match={toSharedMatch(thirdPlaceMatch)}
            onClick={() => openModal(thirdPlaceMatch, "3º Lugar")}
            disabled={isConfirmed}
          />
        </div>
      )}

      {/* rodapé */}
      {exportError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
      {hasExistingBracket && (
        <div className="space-y-3">
          {/* exportar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Exportar:</span>
            <button
              onClick={exportAsImage}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40"
            >
              <ImageIcon className="size-3.5" />
              {exporting === "image" ? "Gerando…" : "PNG"}
            </button>
            <button
              onClick={exportAsPdf}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40"
            >
              <FileText className="size-3.5" />
              {exporting === "pdf" ? "Gerando…" : "PDF"}
            </button>
            <button
              onClick={exportAsText}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40"
            >
              <AlignLeft className="size-3.5" />
              {exporting === "text" ? "Gerando…" : "TXT"}
            </button>
            <button
              onClick={exportAsInstagram}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-40"
            >
              <Share2 className="size-3.5" />
              {exporting === "instagram" ? "Gerando…" : "Instagram"}
            </button>
          </div>

          {/* dica + reiniciar + confirmar vencedores */}
          {!isConfirmed && (
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
          )}

          {/* Botão confirmar vencedores — só para organizador */}
          {!isConfirmed && canConfirm && (
            <button
              onClick={() => { setConfirmError(null); setShowConfirmModal(true); }}
              disabled={!podium || isPending}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors ${
                podium
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}
            >
              <Trophy className="size-4" />
              {podium ? "Confirmar vencedores" : "Confirmar vencedores (chaveamento incompleto)"}
              {!podium && <Lock className="size-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* modal */}
      {modalState && (
        <MatchModal
          state={modalState}
          availableTeams={availableTeams}
          champId={champId}
          catId={catId}
          totalCourts={courtConfiguration?.totalCourts}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}
