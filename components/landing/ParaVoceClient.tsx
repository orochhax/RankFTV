"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/shell/PageContainer";
import { DesktopSheetContourLight } from "@/components/shell/DesktopSheetContourLight";
import {
  ArenaPlansComparison,
  CampeonatoFinanceDetails,
  ParaVoceBenefitsSection,
  ParaVoceFinalBanner,
} from "@/components/landing/ParaVoceDetails";
import {
  PARA_VOCE_CONTENT,
  resolveParaVoceCtas,
  TAB_ICONS,
  type ParaVoceTab,
} from "@/components/landing/para-voce-data";

export type { ParaVoceTab };

const TABS: { id: ParaVoceTab; label: string }[] = [
  { id: "campeonato", label: "Campeonato" },
  { id: "arena", label: "Arena" },
];

export function ParaVoceClient({
  initialTab,
  isLoggedIn,
  hasArena,
}: {
  initialTab: ParaVoceTab;
  isLoggedIn: boolean;
  hasArena: boolean;
}) {
  const [tab, setTab] = useState<ParaVoceTab>(initialTab);
  const copy = PARA_VOCE_CONTENT[tab];
  const ctas = resolveParaVoceCtas(tab, isLoggedIn, hasArena);

  function selectTab(nextTab: ParaVoceTab) {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", `/para-voce?aba=${nextTab}`);
    }
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="relative overflow-hidden bg-brand-dark px-6 pb-16 pt-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-brand/15 blur-3xl"
        />

        <PageContainer width="wide" className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Voltar à Home
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border/40 bg-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
              <Sparkles className="size-3.5" />
              RankFTV Parceiros
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-app-bg/75">
              Selecione o que você deseja gerenciar na plataforma:
            </p>
            <div
              role="tablist"
              aria-label="Tipo de operação no RankFTV"
              className="grid max-w-lg grid-cols-2 gap-1.5 rounded-2xl bg-white/8 p-1.5 ring-1 ring-white/15 backdrop-blur-sm"
            >
              {TABS.map(({ id, label }) => {
                const Icon = TAB_ICONS[id];
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={selected}
                    onClick={() => selectTab(id)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                      selected
                        ? "bg-brand text-white shadow-md shadow-brand/35"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-3xl space-y-4 pt-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl md:leading-[1.12]">
              {copy.heroTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-app-bg/80 sm:text-base">
              {copy.heroSubtitle}
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href={ctas.primary.href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-hover active:scale-[0.99]"
              >
                {ctas.primary.label}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={ctas.secondary.href}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                {ctas.secondary.label}
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-28 pt-8 shadow-sm md:pb-16">
        <DesktopSheetContourLight />
        <PageContainer width="wide">
          <div
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="space-y-10"
          >
            <ParaVoceBenefitsSection copy={copy} />

            {tab === "campeonato" ? <CampeonatoFinanceDetails /> : <ArenaPlansComparison />}

            <ParaVoceFinalBanner
              heading={copy.finalHeading}
              subtitle={copy.finalSubtitle}
              primaryHref={ctas.primary.href}
              primaryLabel={ctas.primary.label}
              switchLabel={copy.switchLabel}
              onSwitchTab={() => selectTab(tab === "campeonato" ? "arena" : "campeonato")}
            />
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
