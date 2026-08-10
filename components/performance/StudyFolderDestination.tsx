"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { createStudyOrganizationPlan, recommendedStudyOrganizationDevice, type StudyDevice, type StudyOrganizationProfile } from "@/lib/study-organization";

export const STUDY_DEVICE_EVENT = "performance:study-device";
export const studyDeviceStorageKey = (roadmapId: string) => `performance:study-device:${roadmapId}`;

export function StudyFolderDestination({ roadmapId, roadmapTitle, moduleTitles, moduleIndex, profile }: {
  roadmapId: string; roadmapTitle: string; moduleTitles: string[]; moduleIndex: number; profile: StudyOrganizationProfile | null;
}) {
  const [device, setDevice] = useState<StudyDevice | undefined>(() => recommendedStudyOrganizationDevice(profile));
  useEffect(() => {
    const saved = localStorage.getItem(studyDeviceStorageKey(roadmapId)) as StudyDevice | null;
    if (saved) queueMicrotask(() => setDevice(saved));
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ roadmapId: string; device: StudyDevice }>).detail;
      if (detail?.roadmapId === roadmapId) setDevice(detail.device);
    };
    window.addEventListener(STUDY_DEVICE_EVENT, listener);
    return () => window.removeEventListener(STUDY_DEVICE_EVENT, listener);
  }, [roadmapId]);
  const plan = useMemo(() => createStudyOrganizationPlan({ roadmapId, roadmapTitle, moduleTitles, profile, selectedDevice: device }), [device, moduleTitles, profile, roadmapId, roadmapTitle]);
  const moduleFolder = plan.folders[moduleIndex] ?? "Pasta do módulo";
  const baseLocation = device === "windows"
    ? "Pasta do usuário"
    : device === "chromebook"
      ? "Meus arquivos"
      : device === "mobile"
        ? "App Arquivos"
        : device === "mac" || device === "linux"
          ? "Pasta pessoal"
          : "Seu dispositivo";

  return <div className="mt-4 flex items-start gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
    <FolderOpen className="mt-0.5 size-4 shrink-0 text-cyan-300" />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase text-cyan-300">Onde salvar os arquivos desta aula</p>
      <p className="mt-1 text-xs text-white/50">Salve tudo na pasta do módulo:</p>
      <p className="mt-1 text-sm font-semibold text-white/85">{moduleFolder}</p>
      <p className="mt-2 text-[11px] text-white/45">Localização no {plan.deviceLabel}:</p>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-white/60">
        <span>{baseLocation}</span>
        <span aria-hidden="true" className="text-cyan-300/55">›</span>
        <span>Estudos</span>
        <span aria-hidden="true" className="text-cyan-300/55">›</span>
        <span className="break-words">{plan.rootFolder}</span>
      </div>
    </div>
  </div>;
}
