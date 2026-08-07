"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FolderTree, Terminal } from "lucide-react";
import {
  createStudyOrganizationPlan,
  recommendedStudyOrganizationDevice,
  studyAvailableDevices,
  studyDeviceLabel,
  type StudyDevice,
  type StudyOrganizationProfile,
} from "@/lib/study-organization";

type CopyState = "idle" | "copied" | "error";
type FallbackDevice = StudyDevice | "";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Browsers can expose the Clipboard API while denying the permission.
      // Fall through to the selection-based copy used by older browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("clipboard-unavailable");
}

export function StudyOrganizationGuide({
  roadmapId,
  roadmapTitle,
  moduleTitles,
  profile,
}: {
  roadmapId: string;
  roadmapTitle: string;
  moduleTitles: string[];
  profile: StudyOrganizationProfile | null;
}) {
  const [fallbackDevice, setFallbackDevice] = useState<FallbackDevice>("");
  const [selectedDevice, setSelectedDevice] = useState<FallbackDevice>("");
  const fallbackProfile = useMemo<StudyOrganizationProfile | null>(() => fallbackDevice ? {
    availableDevices: [fallbackDevice],
    digitalLiteracy: "needs_guidance",
    roadmapType: "skill",
    subject: roadmapTitle,
  } : null, [fallbackDevice, roadmapTitle]);
  const effectiveProfile = profile ?? fallbackProfile;
  const availableDevices = useMemo(() => studyAvailableDevices(effectiveProfile), [effectiveProfile]);
  const activeDevice = selectedDevice && availableDevices.includes(selectedDevice)
    ? selectedDevice
    : recommendedStudyOrganizationDevice(effectiveProfile);
  const availableDeviceLabel = availableDevices.map(studyDeviceLabel).join(" + ");
  const plan = useMemo(() => createStudyOrganizationPlan({
    roadmapId,
    roadmapTitle,
    moduleTitles,
    profile: effectiveProfile,
    selectedDevice: activeDevice,
  }), [activeDevice, effectiveProfile, moduleTitles, roadmapId, roadmapTitle]);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | null>(null);
  const visibleFolders = plan.folders.slice(0, 4);
  const hiddenFolderCount = Math.max(0, plan.folders.length - visibleFolders.length);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = async () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    try {
      await copyText(plan.copyContent);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 3_000);
  };

  return <section aria-labelledby={`study-organization-${roadmapId}`} className="mb-5 overflow-hidden rounded-lg border border-cyan-400/25 bg-cyan-400/[0.055]">
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300"><FolderTree className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">Antes de comecar</p>
            {profile ? <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">Disponiveis: {availableDeviceLabel}</span> : <label>
              <span className="sr-only">Escolha o dispositivo usado para estudar</span>
              <select value={fallbackDevice} onChange={(event) => { setFallbackDevice(event.target.value as FallbackDevice); setCopyState("idle"); }} className="rounded-full border border-white/10 bg-[#111820] px-2 py-1 text-[10px] font-medium text-white/60 outline-none focus:border-cyan-400">
                <option value="">Escolha seu dispositivo</option>
                <option value="windows">PC Windows</option>
                <option value="mac">Mac</option>
                <option value="linux">Computador Linux</option>
                <option value="chromebook">Chromebook</option>
                <option value="mobile">Celular ou tablet</option>
              </select>
            </label>}
          </div>
          <h4 id={`study-organization-${roadmapId}`} className="mt-1 text-sm font-semibold text-white">Organize seus arquivos de estudo</h4>
          <p className="mt-1.5 text-xs leading-5 text-white/60">{plan.intro}</p>
        </div>
      </div>

      {profile && availableDevices.length > 1 && <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-white/35">Criar a estrutura usando</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Escolha um dos seus aparelhos. Basta criar esta estrutura uma vez.</p>
          </div>
          <label>
            <span className="sr-only">Aparelho usado para criar as pastas</span>
            <select value={activeDevice ?? ""} onChange={(event) => {
              if (resetTimer.current) window.clearTimeout(resetTimer.current);
              setSelectedDevice(event.target.value as StudyDevice);
              setCopyState("idle");
            }} className="rounded-md border border-white/10 bg-[#111820] px-3 py-2 text-xs font-medium text-white/70 outline-none focus:border-cyan-400">
              {availableDevices.map((device) => <option key={device} value={device}>{studyDeviceLabel(device)}</option>)}
            </select>
          </label>
        </div>
      </div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-[10px] font-semibold uppercase text-white/35">Onde ficara</p>
          <p className="mt-1.5 break-words font-mono text-xs leading-5 text-cyan-100/80">{plan.destinationLabel}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 p-3">
          <p className="text-[10px] font-semibold uppercase text-white/35">Pastas dos modulos</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleFolders.map((folder) => <span key={folder} className="rounded bg-white/[0.06] px-2 py-1 text-[10px] text-white/60">{folder}</span>)}
            {hiddenFolderCount > 0 && <span className="rounded bg-white/[0.04] px-2 py-1 text-[10px] text-white/40">+{hiddenFolderCount}</span>}
          </div>
        </div>
      </div>

      <ol className={`mt-4 grid gap-2 ${plan.steps.length > 3 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>{plan.steps.map((step, index) => <li key={step} className="flex gap-2 text-xs leading-5 text-white/55"><span className="flex size-5 shrink-0 items-center justify-center rounded bg-cyan-400/10 text-[10px] font-bold text-cyan-300">{index + 1}</span><span>{step}</span></li>)}</ol>
    </div>

    <div className="border-t border-cyan-400/15 bg-black/15 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-white/40"><Terminal className="size-3.5" />{plan.contentLabel}</p>
        <button type="button" onClick={handleCopy} className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${copyState === "copied" ? "bg-emerald-500 text-white" : "bg-cyan-500 text-gray-950 hover:bg-cyan-400"}`}>
          {copyState === "copied" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copyState === "copied" ? "Copiado!" : plan.copyLabel}
        </button>
      </div>
      <pre tabIndex={0} className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-white/10 bg-[#090c10] p-3 font-mono text-[11px] leading-5 text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{plan.copyContent}</pre>
      <div aria-live="polite" className="mt-2 min-h-4 text-[10px] leading-4">
        {copyState === "error" ? <p className="text-red-300">Nao foi possivel copiar automaticamente. Selecione o conteudo acima e copie manualmente.</p> : plan.commandKind === "folder_list" ? <p className="text-white/35">Use esta lista para repetir os mesmos nomes no app de arquivos.</p> : <p className="text-white/35">O comando apenas cria pastas; ele nao apaga nem altera seus arquivos.</p>}
      </div>
    </div>
  </section>;
}
