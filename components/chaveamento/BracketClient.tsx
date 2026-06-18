"use client";

import { useState, useTransition } from "react";
import { Search, X, Trophy, RefreshCcw, Shuffle, ChevronDown, ImageIcon, FileText, AlignLeft, Lock, CheckCircle2 } from "lucide-react";
import { assignTeam, saveScore, clearScore, resetBracket, generateBracket, confirmBracket } from "@/app/painel/campeonatos/[id]/chaveamento/actions";
import { formatDateTimeBR } from "@/lib/format";
import type { TeamDisplay, MatchDisplay, RoundDisplay, SetDetail } from "@/app/painel/campeonatos/[id]/chaveamento/page";

/* ─── layout constants ─── */
const HEADER_H = 28;   // altura fixa do cabeçalho com nome da rodada
const CARD_H   = 93;   // altura fixa do card (36 slot + 20 score + 1 divider + 36 slot)
const SLOT_H   = 101;  // slot efetivo por confronto na grade (CARD_H + 8 gap)

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

function ScoreArea({ setsA, setsB, hasScore }: { setsA: number | null; setsB: number | null; hasScore: boolean }) {
  return (
    <div
      className={`flex items-center justify-center px-3 ${hasScore ? "bg-gray-50" : ""}`}
      style={{ height: "20px" }}
    >
      {hasScore && (
        <span className="text-[11px] font-semibold tabular-nums text-gray-500">
          {setsA} × {setsB}
        </span>
      )}
    </div>
  );
}

/* ─── conector entre rodadas ─── */

function ConnectorColumn({ roundIndex, matchCount }: { roundIndex: number; matchCount: number }) {
  const ri    = roundIndex;
  const pairs = matchCount / 2;
  const W     = 32;
  const MID   = W / 2;
  const h     = Math.ceil(
    HEADER_H + paddingTopFor(ri) + matchCount * CARD_H + Math.max(0, matchCount - 1) * gapFor(ri),
  );

  const lines = [];
  for (let p = 0; p < pairs; p++) {
    const y1 = HEADER_H + SLOT_H * Math.pow(2, ri) * (2 * p + 0.5);
    const y2 = HEADER_H + SLOT_H * Math.pow(2, ri) * (2 * p + 1.5);
    const ym = (y1 + y2) / 2;
    lines.push(
      <g key={p}>
        <line x1={0}   y1={y1} x2={MID} y2={y1} />
        <line x1={MID} y1={y1} x2={MID} y2={y2} />
        <line x1={0}   y1={y2} x2={MID} y2={y2} />
        <line x1={MID} y1={ym} x2={W}   y2={ym} />
      </g>
    );
  }

  return (
    <svg width={W} height={h} className="shrink-0 self-start overflow-visible">
      <g stroke="#d1d5db" strokeWidth={1.5} fill="none" strokeLinecap="round">
        {lines}
      </g>
    </svg>
  );
}

/* ─── sorteio ─── */

function SorteioPanel({
  availableTeams,
  hasExistingBracket,
  champId,
  catId,
}: {
  availableTeams:    TeamDisplay[];
  hasExistingBracket: boolean;
  champId:           string;
  catId:             string;
}) {
  const [open, setOpen]       = useState(!hasExistingBracket);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(availableTeams.map((t) => t.id)),
  );
  const [confirm, setConfirm]     = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected  = selected.size === availableTeams.length;
  const noneSelected = selected.size === 0;

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
    startTransition(async () => {
      await generateBracket(champId, catId, Array.from(selected));
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

          {/* aviso se já existe bracket */}
          {hasExistingBracket && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Isso vai apagar o chaveamento atual e criar um novo com as duplas selecionadas.
            </p>
          )}

          {/* botão gerar */}
          <button
            onClick={handleGenerate}
            disabled={noneSelected || isPending}
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
  const [setDetails, setSetDetails] = useState<Array<{ a: string; b: string }>>(() =>
    match.setDetails?.map((s: SetDetail) => ({ a: s.a.toString(), b: s.b.toString() })) ?? [],
  );
  const [isPending, startTransition] = useTransition();

  const sa = parseInt(setsA);
  const sb = parseInt(setsB);
  const totalSets = (isNaN(sa) ? 0 : sa) + (isNaN(sb) ? 0 : sb);

  const filteredTeams = availableTeams.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const canSaveScore = !!match.teamA && !!match.teamB && setsA !== "" && setsB !== "";

  function updateSetDetail(idx: number, field: "a" | "b", val: string) {
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
    const details: Array<{ a: number; b: number }> | null =
      totalSets > 0
        ? Array.from({ length: totalSets }, (_, i) => ({
            a: parseInt(setDetails[i]?.a ?? "") || 0,
            b: parseInt(setDetails[i]?.b ?? "") || 0,
          }))
        : null;
    startTransition(async () => {
      await saveScore(
        match.dbId, sa, sb,
        match.teamA?.id ?? null,
        match.teamB?.id ?? null,
        champId, catId,
        match.roundIndex, match.matchIndex,
        details,
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
};

function computePodium(rounds: RoundDisplay[]): Podium | null {
  if (rounds.length === 0) return null;
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound.matches[0];
  if (!finalMatch?.winnerId || !finalMatch.teamA || !finalMatch.teamB) return null;

  const first  = finalMatch.winnerId === finalMatch.teamA.id ? finalMatch.teamA : finalMatch.teamB;
  const second = finalMatch.winnerId === finalMatch.teamA.id ? finalMatch.teamB : finalMatch.teamA;

  const thirds: TeamDisplay[] = [];
  if (rounds.length >= 2) {
    const semiRound = rounds[rounds.length - 2];
    for (const m of semiRound.matches) {
      if (m.winnerId && m.teamA && m.teamB) {
        thirds.push(m.winnerId === m.teamA.id ? m.teamB : m.teamA);
      }
    }
  }

  return { first, second, thirds };
}

export function BracketClient({
  champId,
  catId,
  rounds,
  availableTeams,
  confirmedAt,
}: {
  champId:        string;
  catId:          string;
  rounds:         RoundDisplay[];
  availableTeams: TeamDisplay[];
  confirmedAt:    string | null;
}) {
  const [modalState, setModalState]         = useState<ModalState | null>(null);
  const [confirmReset, setConfirmReset]     = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmError, setConfirmError]     = useState<string | null>(null);
  const [exporting, setExporting]           = useState<"image" | "pdf" | "text" | null>(null);
  const [isPending, startTransition]        = useTransition();

  const isConfirmed = !!confirmedAt;
  const podium      = computePodium(rounds);

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
    setExporting("image");
    try {
      const { drawBracket } = await import("@/components/chaveamento/drawBracket");
      const { dataUrl } = drawBracket(rounds);
      const a = document.createElement("a");
      a.download = "chaveamento.png";
      a.href = dataUrl;
      a.click();
    } finally {
      setExporting(null);
    }
  }

  async function exportAsPdf() {
    setExporting("pdf");
    try {
      const [{ drawBracket }, { jsPDF }] = await Promise.all([
        import("@/components/chaveamento/drawBracket"),
        import("jspdf"),
      ]);
      const { dataUrl, logicalW, logicalH } = drawBracket(rounds);
      const pdf = new jsPDF({
        orientation: logicalW > logicalH ? "landscape" : "portrait",
        unit: "px",
        format: [logicalW, logicalH],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, logicalW, logicalH);
      pdf.save("chaveamento.pdf");
    } finally {
      setExporting(null);
    }
  }

  function exportAsText() {
    setExporting("text");
    const lines: string[] = [];
    lines.push("CHAVEAMENTO");
    lines.push("=".repeat(50));

    for (const round of rounds) {
      lines.push("");
      lines.push(round.nome.toUpperCase());
      lines.push("-".repeat(30));
      round.matches.forEach((match, i) => {
        const a = match.teamA?.nome ?? "A definir";
        const b = match.teamB?.nome ?? "A definir";
        let line = `Confronto ${i + 1}: ${a} vs ${b}`;
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

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    startTransition(async () => {
      await resetBracket(champId, catId);
    });
  }

  const hasExistingBracket = rounds.length > 0;

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
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Resultado confirmado</p>
            <p className="text-xs text-emerald-600">Confirmado em {formatDateTimeBR(confirmedAt!)} · Somente visualização</p>
          </div>
        </div>
      )}

      {/* sorteio — oculto após confirmação */}
      {!isConfirmed && (
        <SorteioPanel
          availableTeams={availableTeams}
          hasExistingBracket={hasExistingBracket}
          champId={champId}
          catId={catId}
        />
      )}

      {/* bracket */}
      {hasExistingBracket && <div className="overflow-x-auto pb-6">
        <div className="flex" style={{ minWidth: "max-content" }}>
          {rounds.flatMap((round, idx) => {
            const ri     = round.roundIndex;
            const pt     = paddingTopFor(ri);
            const isLast = idx === rounds.length - 1;

            const col = (
              <div key={`round-${ri}`} className="flex flex-col">
                {/* label em fluxo normal — altura fixa igual a HEADER_H */}
                <div className="flex shrink-0 items-end justify-center pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400" style={{ height: `${HEADER_H}px` }}>
                  {round.nome}
                </div>

                {/* cards */}
                <div
                  className="flex flex-col"
                  style={{ paddingTop: `${pt}px`, gap: `${gapFor(ri)}px` }}
                >
                  {round.matches.map((match) => {
                    const byeA    = !match.teamA && !!match.teamB;
                    const byeB    = !match.teamB && !!match.teamA;
                    const isTBD   = !match.teamA && !match.teamB;
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
                        <SlotRow team={match.teamA} winner={match.winnerId === match.teamA?.id} bye={byeA} />
                        <ScoreArea setsA={match.setsA} setsB={match.setsB} hasScore={hasScore} />
                        <div className="h-px bg-gray-100" />
                        <SlotRow team={match.teamB} winner={match.winnerId === match.teamB?.id} bye={byeB} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );

            return isLast
              ? [col]
              : [col, <ConnectorColumn key={`conn-${ri}`} roundIndex={ri} matchCount={round.matches.length} />];
          })}
        </div>
      </div>}

      {/* rodapé */}
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

          {/* Botão confirmar vencedores */}
          {!isConfirmed && (
            <button
              onClick={() => { setConfirmError(null); setShowConfirmModal(true); }}
              disabled={!podium || isPending}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors ${
                podium
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
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
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}
