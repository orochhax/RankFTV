"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Activity, CalendarDays, Flame, Goal, ListChecks, Settings2, Wallet } from "lucide-react";
// The client facade already owned this Server Action boundary before the UI split.
// eslint-disable-next-line import-x/no-restricted-paths
import { criarAtividadeLifeOS, criarMetaLifeOS, salvarCarteiraLifeOS } from "@/app/admin/performance/life-os-actions";
import { dayProgress, type LifeOSView, isoDateToLabel } from "@/lib/performance-life-os";
import { MetasDoDia as MetasDoDiaBase } from "@/components/performance/MetasDoDia";
import { CalendarClient } from "@/components/performance/CalendarClient";
import { expandEventOccurrences } from "@/lib/event-recurrence";
import { HabitAnalytics } from "@/components/performance/HabitAnalytics";
import { AcademyWorkspace } from "@/components/performance/AcademyWorkspace";
import { StudiesWorkspace } from "@/components/performance/StudiesWorkspace";
import { InvestmentsWorkspace } from "@/components/performance/InvestmentsWorkspace";
import { LifeOSProps } from "./types";
import { ActionForm, Field } from "./ui-primitives";
import { DashboardViewLegacy } from "./dashboard-view";
import { EventForm } from "./event-and-task-forms";
import { Modal, SettingsView } from "./modal-widgets";

const nav: { id: LifeOSView; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Dashboard", icon: Activity },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "habits", label: "Habitos", icon: ListChecks },
  { id: "activities", label: "Academia", icon: Flame },
  { id: "goals", label: "Estudos", icon: Goal },
  { id: "investments", label: "Investimentos", icon: Wallet },
  { id: "settings", label: "Perfil", icon: Settings2 },
];

export function LifeOSDashboard(props: LifeOSProps) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("view") as LifeOSView | null;
  const view =
    requested && nav.some((item) => item.id === requested)
      ? requested
      : "today";
  const [quick, setQuick] = useState<
    "event" | "activity" | "goal" | "portfolio" | null
  >(params.get("newEvent") === "1" ? "event" : null);
  const go = (next: LifeOSView) =>
    router.replace(`/admin/performance?view=${next}`, { scroll: false });
  const progress = dayProgress(props.habits, props.logs, props.today);
  const todayEvents = expandEventOccurrences(props.events, { from: props.today, to: props.today });
  return (
    <div className="life-os-theme min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0b0d10] text-white">
      <header className="border-b border-white/10 bg-[#0b0d10] px-3 pb-5 pt-4 sm:px-4 lg:px-6 2xl:px-8">
        <div className="w-full min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase text-white/40">Life OS</p>
              <h1 className="mt-1 truncate text-2xl font-bold">
                Ola, {props.nome.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {isoDateToLabel(props.today)} · evolucao real e decisoes por
                dados.
              </p>
            </div>
            {props.fotoUrl ? (
              <Image
                src={props.fotoUrl}
                alt={props.nome}
                width={44}
                height={44}
                className="size-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold">
                {props.nome
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            )}
          </div>
          <nav
            className="mt-5 flex gap-1 overflow-x-auto pb-1"
            aria-label="Life OS"
          >
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${view === id ? "bg-white text-gray-900" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="w-full min-w-0 px-3 py-5 pb-24 sm:px-4 lg:px-6 2xl:px-8">
        {!props.schemaReady && (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            Ha uma migracao do Life OS aguardando aplicacao. Seus dados atuais
            continuam preservados.
          </p>
        )}
        {view === "today" && (
          <DashboardViewLegacy
            {...props}
            progress={progress}
            todayEvents={todayEvents}
            onQuick={setQuick}
          />
        )}
        {view === "agenda" && (
          <CalendarClient
            events={props.events}
            embedded
            initialDate={props.today}
          />
        )}
        {view === "habits" && (
          <>
            <MetasDoDiaBase
              habits={props.habits}
              valoresIniciais={props.valoresHoje}
              hoje={props.today}
            />
            <HabitAnalytics
              habits={props.habits}
              logs={props.logs}
              today={props.today}
            />
          </>
        )}
        {view === "activities" && (
          <AcademyWorkspace
            activities={props.activities}
            workoutTemplates={props.academyWorkoutTemplates}
            weights={props.weights}
            today={props.today}
            heightCm={props.alturaCm}
            currentWeight={props.pesoAtual}
            targetWeight={props.profile?.peso_meta ?? null}
          />
        )}
        {view === "goals" && (
          <StudiesWorkspace
            roadmaps={props.studyRoadmaps}
            items={props.studyItems}
            modules={props.studyModules}
            questions={props.studyQuestions}
            attempts={props.studyAttempts}
            checkProgress={props.studyCheckProgress}
            checkProgressReady={props.studyCheckProgressReady}
            drafts={props.studyDrafts}
            generationJobs={props.studyGenerationJobs}
            activities={props.activities}
            today={props.today}
            monday={props.monday}
            v2Ready={props.studyV2Ready}
            draftsReady={props.studyDraftsReady}
            enhancementsReady={props.studyEnhancementsReady}
            referenceStandardReady={props.studyReferenceStandardReady}
            itCatalogReady={props.studyItCatalogReady}
          />
        )}
        {view === "investments" && (
          <InvestmentsWorkspace
            snapshots={props.snapshots}
            withdrawals={props.withdrawals}
            contributions={props.contributions}
            today={props.today}
            plan={props.investmentPlan}
            planRevisions={props.investmentPlanRevisions}
            historicalPlans={props.investmentPlanHistory}
            historicalPlanRevisions={props.investmentPlanRevisionHistory}
            routeSchemaReady={props.investmentRouteSchemaReady}
            contributionWriteReady={props.investmentContributionWriteReady}
            routeLoadError={props.investmentRouteLoadError}
            movementsLoadError={props.investmentMovementsLoadError}
          />
        )}
        {view === "settings" && <SettingsView {...props} />}
      </main>
      {quick === "event" && (
        <Modal title="Novo evento" onClose={() => setQuick(null)}>
          <EventForm onDone={() => setQuick(null)} />
        </Modal>
      )}
      {quick === "activity" && (
        <Modal title="Registrar atividade" onClose={() => setQuick(null)}>
          <ActionForm
            action={criarAtividadeLifeOS}
            onDone={() => setQuick(null)}
          >
            <Field name="area" title="Area" required />
            <Field name="date" title="Data" type="date" required />
            <Field name="title" title="Titulo" required />
            <Field
              name="duration_minutes"
              title="Duracao (min)"
              type="number"
            />
            <Field name="notes" title="Observacao" />
          </ActionForm>
        </Modal>
      )}
      {quick === "goal" && (
        <Modal title="Nova meta" onClose={() => setQuick(null)}>
          <ActionForm action={criarMetaLifeOS} onDone={() => setQuick(null)}>
            <Field name="name" title="Nome" required />
            <Field
              name="target_value"
              title="Valor-alvo"
              type="number"
              required
            />
            <Field name="area" title="Area" />
            <Field name="unit" title="Unidade" />
          </ActionForm>
        </Modal>
      )}
      {quick === "portfolio" && (
        <Modal title="Atualizar carteira" onClose={() => setQuick(null)}>
          <ActionForm
            action={salvarCarteiraLifeOS}
            onDone={() => setQuick(null)}
          >
            <Field name="date" title="Data" type="date" required />
            <Field
              name="total_value"
              title="Valor atual"
              type="number"
              required
            />
          </ActionForm>
        </Modal>
      )}
    </div>
  );
}
