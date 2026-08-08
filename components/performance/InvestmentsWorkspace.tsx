"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  arquivarPlanoInvestimento,
  concluirPlanoInvestimento,
  criarPlanoInvestimento,
  editarAporteInvestimento,
  editarRetiradaInvestimento,
  fazerCheckinInvestimento,
  registrarAporteInvestimento,
  registrarRetiradaInvestimento,
  removerAporteInvestimento,
  removerRetiradaInvestimento,
  revisarPlanoInvestimento,
  type InvestmentActionResult,
} from "@/app/admin/performance/investment-actions";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { InvestmentCheckinDialog } from "@/components/performance/investments/InvestmentCheckinDialog";
import { InvestmentFutureComparison } from "@/components/performance/investments/InvestmentFutureComparison";
import { InvestmentLogbook } from "@/components/performance/investments/InvestmentLogbook";
import { InvestmentMovementDialog } from "@/components/performance/investments/InvestmentMovementDialog";
import { InvestmentMovements } from "@/components/performance/investments/InvestmentMovements";
import {
  InvestmentPlanDialog,
  type InvestmentPlanFormValues,
} from "@/components/performance/investments/InvestmentPlanDialog";
import { InvestmentRouteBreakdown } from "@/components/performance/investments/InvestmentRouteBreakdown";
import { InvestmentRouteHeader } from "@/components/performance/investments/InvestmentRouteHeader";
import { InvestmentRouteHero } from "@/components/performance/investments/InvestmentRouteHero";
import { InvestmentRouteSetupState } from "@/components/performance/investments/InvestmentRouteSetupState";
import { InvestmentScenarioLab } from "@/components/performance/investments/InvestmentScenarioLab";
import { InvestmentTrajectoryChart } from "@/components/performance/investments/InvestmentTrajectoryChart";
import { MonthlyInvestmentAction } from "@/components/performance/investments/MonthlyInvestmentAction";
import type {
  FutureModel,
  InvestmentWithdrawalRow,
  LogbookEntry,
  MonthlyActionModel,
  RouteBreakdownModel,
  RouteHeroModel,
  RouteProjectionPoint,
  RouteQualityKey,
  RouteStatusKey,
  ScenarioDraft,
  ScenarioResultModel,
} from "@/components/performance/investments/types";
import {
  dateLabel,
  money,
  primaryButtonClass,
  Surface,
} from "@/components/performance/investments/ui";
import { addDays } from "@/lib/performance";
import type { PortfolioSnapshot } from "@/lib/performance-life-os";
import type { InvestmentContribution } from "@/lib/performance-widgets";
import {
  MAX_REACH_MONTHS,
  buildInvestmentRouteDashboard,
  buildTrajectorySeries,
  monthsBetweenDates,
  normalizeTargetDate,
  projectPortfolio,
  simulateInvestmentScenario,
  type InvestmentPlan,
  type InvestmentPlanRevision,
  type InvestmentRouteDashboard,
  type InvestmentScenarioDraft,
} from "@/lib/investment-route";

export type InvestmentPlanHistoryItem = InvestmentPlan & {
  archivedAt?: string | null;
};

export type InvestmentsWorkspaceProps = {
  contributions: InvestmentContribution[];
  snapshots: PortfolioSnapshot[];
  withdrawals: InvestmentWithdrawalRow[];
  today: string;
  plan: InvestmentPlan | null;
  planRevisions: InvestmentPlanRevision[];
  historicalPlans?: InvestmentPlanHistoryItem[];
  historicalPlanRevisions?: InvestmentPlanRevision[];
  routeSchemaReady: boolean;
  contributionWriteReady?: boolean;
  routeLoadError?: string | null;
  movementsLoadError?: string | null;
};

type MovementDialogState =
  | { kind: "contribution"; item: InvestmentContribution | null }
  | { kind: "withdrawal"; item: InvestmentWithdrawalRow | null }
  | null;

export function InvestmentsWorkspace({
  contributions,
  snapshots,
  withdrawals,
  today,
  plan,
  planRevisions,
  historicalPlans = [],
  historicalPlanRevisions = [],
  routeSchemaReady,
  contributionWriteReady = true,
  routeLoadError = null,
  movementsLoadError = null,
}: InvestmentsWorkspaceProps) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
  const [planDialog, setPlanDialog] = useState<"create" | "edit" | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [movementDialog, setMovementDialog] =
    useState<MovementDialogState>(null);
  const [scenarioOverride, setScenarioOverride] =
    useState<ScenarioDraft | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [refreshPending, startRefresh] = useTransition();

  const queryState = !routeSchemaReady
    ? ("migration_missing" as const)
    : routeLoadError || movementsLoadError
      ? ("error" as const)
      : ("ready" as const);
  const dashboardState = useMemo<{
    dashboard: InvestmentRouteDashboard | null;
    error: string | null;
  }>(() => {
    try {
      return {
        dashboard: buildInvestmentRouteDashboard({
          plan,
          revisions: planRevisions,
          snapshots,
          contributions,
          withdrawals,
          asOfDate: today,
          queryState,
        }),
        error: null,
      };
    } catch {
      return {
        dashboard: null,
        error:
          "Não foi possível projetar com estas premissas. Revise os valores e tente novamente.",
      };
    }
  }, [
    contributions,
    plan,
    planRevisions,
    queryState,
    snapshots,
    today,
    withdrawals,
  ]);
  const dashboard = dashboardState.dashboard;
  const revision = dashboard?.routeRevision ?? latestRevision(planRevisions);
  const currentValue =
    dashboard?.currentValue?.estimated ??
    latestSnapshot(snapshots)?.totalValue ??
    null;

  const baseScenario = useMemo<ScenarioDraft>(
    () => ({
      monthlyContribution: revision?.plannedMonthlyContribution ?? 0,
      oneTimeContribution: 0,
      oneTimeContributionDate: addDays(today, 1),
      pauseMonths: 0,
      futureWithdrawal: 0,
      futureWithdrawalDate: addDays(today, 1),
      targetDate: revision?.targetDate ?? addYears(today, 10),
      targetValue: revision?.targetValue ?? 0,
      annualReturn: revision?.annualReturnBase ?? 0.04,
    }),
    [revision, today],
  );
  const scenario = scenarioOverride ?? baseScenario;
  const normalizedScenarioTarget = safeNormalizeTargetDate(scenario.targetDate);
  const engineScenario = useMemo(() => toEngineScenario(scenario), [scenario]);
  const scenarioHasPersistableChanges = useMemo(
    () =>
      Boolean(revision && hasPersistableScenarioChanges(scenario, revision)),
    [revision, scenario],
  );
  const scenarioHasTransientChanges =
    scenario.oneTimeContribution > 0 ||
    scenario.pauseMonths > 0 ||
    scenario.futureWithdrawal > 0;
  const scenarioCanApplyAtTarget = Boolean(
    normalizedScenarioTarget && normalizedScenarioTarget >= nextMonthStart(today),
  );
  const scenarioBaseFitsRange = Boolean(
    revision &&
      scenario.annualReturn >= revision.annualReturnConservative &&
      scenario.annualReturn <= revision.annualReturnFavorable,
  );
  const scenarioPersistableNumbersValid =
    isPersistableMoney(scenario.monthlyContribution, true) &&
    isPersistableMoney(scenario.targetValue, false) &&
    Number.isFinite(scenario.annualReturn) &&
    Math.abs(scenario.annualReturn * 100_000_000 - Math.round(scenario.annualReturn * 100_000_000)) < 1e-6;
  const scenarioCanApply =
    scenarioHasPersistableChanges &&
    !scenarioHasTransientChanges &&
    scenarioCanApplyAtTarget &&
    scenarioBaseFitsRange &&
    scenarioPersistableNumbersValid;
  const scenarioApplyBlockedReason = scenarioHasTransientChanges
    ? "Zere o aporte extra, a pausa e a retirada temporária antes de aplicar. Assim, a revisão salva reproduzirá exatamente a rota confirmada."
    : !scenarioCanApplyAtTarget
      ? `Para aplicar como revisão agendada, escolha um mês-alvo a partir de ${dateLabel(nextMonthStart(today))}.`
      : !scenarioBaseFitsRange
        ? "Para aplicar sem mudar silenciosamente a faixa, mantenha a taxa-base entre os cenários conservador e favorável atuais."
        : !scenarioPersistableNumbersValid
          ? "Use valores financeiros com no máximo duas casas decimais e uma taxa válida antes de aplicar."
      : null;
  const scenarioState = useMemo<{
    result: ScenarioResultModel;
    projection: ReturnType<typeof simulateInvestmentScenario> | null;
  }>(() => {
    const savedPlanProjection = dashboard?.projections.followingPlan ?? null;
    if (
      !dashboard ||
      !revision ||
      currentValue == null ||
      !dashboard.dataQuality.canProject ||
      !normalizedScenarioTarget
    )
      return {
        projection: null,
        result: {
          projectedValue: null,
          baseProjectedValue: savedPlanProjection,
          deltaValue: null,
          reachDate: null,
          monthDifference: null,
          contributionDelta: revision
            ? scenario.monthlyContribution - revision.plannedMonthlyContribution
            : null,
          targetDateDeltaMonths: revision && normalizedScenarioTarget
            ? monthsBetweenDates(
                normalizeTargetDate(revision.targetDate),
                normalizedScenarioTarget,
              )
            : null,
          error:
            !normalizedScenarioTarget
              ? "Informe um mês-alvo válido para recalcular a simulação."
              : "Faça um check-in recente antes de simular ou aplicar mudanças ao plano.",
        },
      };
    try {
      const projection = simulateInvestmentScenario({
        revision,
        anchorDate: today,
        anchorValue: currentValue,
        draft: engineScenario,
      });
      return {
        projection: scenarioOverride ? projection : null,
        result: {
          projectedValue: projection.projectedValue,
          baseProjectedValue: savedPlanProjection,
          deltaValue:
            savedPlanProjection == null
              ? null
              : projection.projectedValue - savedPlanProjection,
          reachDate: projection.reachedAt,
          monthDifference: projection.reachedAt
            ? monthsBetweenDates(
                normalizeTargetDate(scenario.targetDate),
                normalizeTargetDate(projection.reachedAt),
              )
            : null,
          contributionDelta:
            scenario.monthlyContribution - revision.plannedMonthlyContribution,
          targetDateDeltaMonths: monthsBetweenDates(
            normalizeTargetDate(revision.targetDate),
            normalizeTargetDate(scenario.targetDate),
          ),
        },
      };
    } catch {
      return {
        projection: null,
        result: {
          projectedValue: null,
          baseProjectedValue: savedPlanProjection,
          deltaValue: null,
          reachDate: null,
          monthDifference: null,
          contributionDelta:
            scenario.monthlyContribution - revision.plannedMonthlyContribution,
          targetDateDeltaMonths: monthsBetweenDates(
            normalizeTargetDate(revision.targetDate),
            normalizeTargetDate(scenario.targetDate),
          ),
          error:
            "Não foi possível projetar com estas premissas. Revise datas, valores e taxas.",
        },
      };
    }
  }, [
    currentValue,
    dashboard,
    engineScenario,
    revision,
    scenario.monthlyContribution,
    scenario.targetDate,
    normalizedScenarioTarget,
    scenarioOverride,
    today,
  ]);

  const trajectory = useMemo(() => {
    if (!dashboard || !scenarioOverride) return dashboard?.trajectory ?? null;
    try {
      return buildTrajectorySeries({
        revisions: planRevisions,
        snapshots,
        contributions,
        withdrawals,
        asOfDate: today,
        currentMonthlyContribution: dashboard.pace.hasSufficientHistory
          ? dashboard.pace.monthlyAverage
          : null,
        simulation: engineScenario,
        queryState,
      });
    } catch {
      return dashboard.trajectory;
    }
  }, [
    contributions,
    dashboard,
    engineScenario,
    planRevisions,
    queryState,
    scenarioOverride,
    snapshots,
    today,
    withdrawals,
  ]);

  const chartPoints = useMemo(
    () => mapTrajectoryPoints(trajectory?.points ?? [], dashboard, today),
    [dashboard, today, trajectory?.points],
  );
  const hero =
    dashboard && revision ? buildHeroModel(dashboard, revision) : null;
  const monthlyAction =
    dashboard && revision
      ? buildMonthlyAction(dashboard, revision, today)
      : null;
  const monthlyImpact = useMemo(
    () => computeMonthlyImpact(dashboard, revision, today, monthlyAction),
    [dashboard, monthlyAction, revision, today],
  );
  const futures = useMemo(
    () => buildFutures(dashboard, revision, today),
    [dashboard, revision, today],
  );
  const breakdown = buildBreakdown(dashboard, planRevisions);
  const logbookPlans = useMemo(
    () => mergePlanHistory(historicalPlans, plan),
    [historicalPlans, plan],
  );
  const logbookRevisions = useMemo(
    () => mergeRevisionHistory(historicalPlanRevisions, planRevisions),
    [historicalPlanRevisions, planRevisions],
  );
  const logbook = useMemo(
    () =>
      buildLogbook(
        logbookPlans,
        logbookRevisions,
        snapshots,
        contributions,
        withdrawals,
      ),
    [contributions, logbookPlans, logbookRevisions, snapshots, withdrawals],
  );
  const hasInactivePlanHistory = logbookPlans.some((item) => !item.active);
  const latest = latestSnapshot(snapshots);
  const planInitial = useMemo(
    () =>
      planFormInitial(
        plan,
        revision,
        currentValue == null ? null : roundMoney(currentValue),
        latest,
        today,
        Boolean(revision && dashboard?.currentRevision?.id === revision.id),
      ),
    [
      currentValue,
      dashboard?.currentRevision?.id,
      latest,
      plan,
      revision,
      today,
    ],
  );

  const refreshWithNotice = (message: string) => {
    setNotice({ tone: "success", text: message });
    setScenarioOverride(null);
    startRefresh(() => router.refresh());
  };
  const showActionError = (result: InvestmentActionResult, fallback: string) =>
    setNotice({ tone: "error", text: result.error ?? fallback });
  const showUnexpectedActionError = (fallback: string) =>
    setNotice({
      tone: "error",
      text: navigator.onLine
        ? fallback
        : "Você está sem conexão. Nada foi salvo ainda.",
    });
  const openCheckin = () => {
    if (movementsLoadError) {
      setNotice({
        tone: "error",
        text: "Recarregue os dados antes de fazer um check-in. Assim nenhum aporte ou retirada ficará fora da prévia.",
      });
      return;
    }
    setCheckinOpen(true);
  };
  const openContribution = () => {
    if (!contributionWriteReady) {
      setNotice({
        tone: "error",
        text: "Os aportes legados estão disponíveis somente para leitura até a migração da tabela canônica. Nenhuma informação foi perdida.",
      });
      return;
    }
    setMovementDialog({ kind: "contribution", item: null });
  };
  const submitPlan = async (
    data: FormData,
  ): Promise<InvestmentActionResult> => {
    if (planDialog === "edit" && plan)
      return revisarPlanoInvestimento(plan.id, data);
    data.set("create_initial_snapshot", latest ? "false" : "true");
    if (!latest)
      data.set(
        "initial_snapshot_notes",
        "Check-in inicial criado com o plano da Carteira em Rota.",
      );
    return criarPlanoInvestimento(data);
  };
  const runDelete = async (
    kind: "contribution" | "withdrawal",
    item: InvestmentContribution | InvestmentWithdrawalRow,
  ) => {
    if (actionPending) return;
    const approved = await confirm({
      title: `Excluir ${kind === "contribution" ? "aporte" : "retirada"}?`,
      description: `${money(item.amount)} de ${dateLabel(item.date)} será removido definitivamente e a rota será recalculada.`,
      confirmLabel: "Excluir movimentação",
    });
    if (!approved) return;
    setActionPending(true);
    try {
      const result =
        kind === "contribution"
          ? await removerAporteInvestimento(item.id)
          : await removerRetiradaInvestimento(item.id);
      if (result.ok)
        refreshWithNotice(result.message ?? "Movimentação removida.");
      else showActionError(result, "Não foi possível remover a movimentação.");
    } catch {
      showUnexpectedActionError(
        "Não foi possível remover a movimentação. Tente novamente.",
      );
    } finally {
      setActionPending(false);
    }
  };
  const applyScenario = async () => {
    if (
      !plan ||
      !revision ||
      !scenarioOverride ||
      !scenarioCanApply ||
      actionPending
    )
      return;
    const approved = await confirm({
      title: "Aplicar simulação ao plano?",
      description: `Aporte mensal: ${money(revision.plannedMonthlyContribution)} → ${money(scenario.monthlyContribution)}. Meta: ${money(revision.targetValue)} em ${dateLabel(normalizeTargetDate(revision.targetDate))} → ${money(scenario.targetValue)} em ${dateLabel(normalizeTargetDate(scenario.targetDate))}. Taxa-base: ${formatAnnualRate(revision.annualReturnBase)} → ${formatAnnualRate(scenario.annualReturn)}. A nova revisão valerá a partir de ${dateLabel(nextMonthStart(today))}; a anterior continuará no diário.`,
      confirmLabel: "Criar nova revisão",
      tone: "primary",
    });
    if (!approved) return;
    setActionPending(true);
    try {
      const data = revisionFormData(
        plan,
        revision,
        scenario,
        today,
        currentValue == null ? null : roundMoney(currentValue),
      );
      const result = await revisarPlanoInvestimento(plan.id, data);
      if (result.ok)
        refreshWithNotice(
          result.message ?? "Plano ajustado. Sua rota foi recalculada.",
        );
      else showActionError(result, "Não foi possível aplicar a simulação.");
    } catch {
      showUnexpectedActionError(
        "Não foi possível aplicar a simulação. Tente novamente.",
      );
    } finally {
      setActionPending(false);
    }
  };
  const finishPlan = async (kind: "complete" | "archive") => {
    if (!plan || actionPending) return;
    const approved = await confirm({
      title:
        kind === "complete" ? "Concluir este destino?" : "Arquivar este plano?",
      description:
        kind === "complete"
          ? "O plano será marcado como concluído e o histórico permanecerá disponível."
          : "O plano deixará de ser ativo, mas nenhuma revisão ou movimentação será apagada.",
      confirmLabel: kind === "complete" ? "Concluir destino" : "Arquivar plano",
      tone: "primary",
    });
    if (!approved) return;
    setActionPending(true);
    try {
      const result =
        kind === "complete"
          ? await concluirPlanoInvestimento(plan.id)
          : await arquivarPlanoInvestimento(plan.id);
      if (result.ok) refreshWithNotice(result.message ?? "Plano atualizado.");
      else showActionError(result, "Não foi possível atualizar o plano.");
    } catch {
      showUnexpectedActionError(
        "Não foi possível atualizar o plano. Tente novamente.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const scrollToMovements = () =>
    document
      .getElementById("investment-movements")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });

  return (
    <section className="min-w-0 space-y-5 pb-8">
      <InvestmentRouteHeader
        lastCheckinDate={latest?.date ?? null}
        snapshotAgeDays={dashboard?.dataQuality.snapshotAgeDays ?? null}
        dataIsEstimated={Boolean(dashboard?.currentValue?.isEstimated)}
        dataUnavailable={Boolean(movementsLoadError)}
        onCheckin={openCheckin}
        onEditPlan={() => setPlanDialog("edit")}
        hasPlan={Boolean(
          plan && revision && routeSchemaReady && !movementsLoadError,
        )}
      />
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${notice.tone === "success" ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100" : "border-red-300/20 bg-red-300/[0.08] text-red-100"}`}
        >
          {notice.tone === "success" ? (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="min-w-0 flex-1">{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="-m-2 inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/[0.06]"
            aria-label="Fechar aviso"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {refreshPending ? "Recalculando sua rota…" : ""}
      </p>

      {!movementsLoadError && !contributionWriteReady && (
        <Surface className="border-amber-300/15 p-4" as="div">
          <p className="text-sm leading-6 text-amber-100">
            Aportes legados carregados em modo somente leitura. A rota continua
            disponível, mas novos aportes exigem a migração da fonte canônica.
          </p>
        </Surface>
      )}

      {dashboardState.error && (
        <Surface className="p-5" as="div">
          <div
            role="alert"
            className="flex items-start gap-3 text-sm leading-6 text-red-200"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Não foi possível carregar esta parte da sua rota.
              </p>
              <p className="mt-1 text-white/60">{dashboardState.error}</p>
              <button
                type="button"
                onClick={() => router.refresh()}
                className={`${primaryButtonClass} mt-3`}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </Surface>
      )}
      {routeLoadError && (
        <Surface className="border-amber-300/15 p-4" as="div">
          <div role="alert" className="text-sm leading-6 text-amber-100">
            <p>Não foi possível carregar os detalhes do plano neste momento.</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className={`${primaryButtonClass} mt-3`}
            >
              Tentar novamente
            </button>
          </div>
        </Surface>
      )}
      {movementsLoadError && (
        <Surface className="border-amber-300/15 p-4" as="div">
          <div role="alert" className="text-sm leading-6 text-amber-100">
            <p>
              {movementsLoadError} Nenhum dado ausente foi tratado como zero.
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className={`${primaryButtonClass} mt-3`}
            >
              Recarregar dados
            </button>
          </div>
        </Surface>
      )}

      {!routeLoadError &&
        (!plan || !revision || !routeSchemaReady
          ? !movementsLoadError && (
              <InvestmentRouteSetupState
                schemaReady={routeSchemaReady}
                hasSnapshot={Boolean(latest)}
                onCreatePlan={() => setPlanDialog("create")}
                onCheckin={openCheckin}
              />
            )
          : dashboard &&
            hero && (
              <>
                <InvestmentRouteHero model={hero} />
                {!movementsLoadError && !dashboard.currentValue && (
                  <Surface className="p-5 sm:p-6">
                    <h2 className="font-semibold">
                      Ainda não sabemos onde sua carteira está hoje
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Faça o primeiro check-in para iniciar a projeção sem
                      confundir aportes com patrimônio.
                    </p>
                    <button
                      type="button"
                      onClick={openCheckin}
                      className={`${primaryButtonClass} mt-4`}
                    >
                      Fazer primeiro check-in
                    </button>
                  </Surface>
                )}
                <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <InvestmentTrajectoryChart
                    points={chartPoints}
                    today={today}
                    targetDate={normalizeTargetDate(revision.targetDate)}
                    targetValue={revision.targetValue}
                    valueModeLabel={
                      revision.valueMode === "real"
                        ? `Valores reais de ${dateLabel(revision.valueReferenceDate)}`
                        : "Valores nominais"
                    }
                    assumptions={{
                      conservative: revision.annualReturnConservative,
                      base: revision.annualReturnBase,
                      favorable: revision.annualReturnFavorable,
                      inflation: revision.annualInflation,
                    }}
                    simulationActive={Boolean(
                      scenarioOverride && !scenarioState.result.error,
                    )}
                    originalPlanConverted={
                      dashboard.trajectory.originalPlanConverted
                    }
                  />
                  {!movementsLoadError && monthlyAction && (
                    <MonthlyInvestmentAction
                      model={{ ...monthlyAction, impact: monthlyImpact }}
                      onAddContribution={openContribution}
                      onShowMovements={scrollToMovements}
                    />
                  )}
                </div>
                {!movementsLoadError && (
                  <>
                    {futures && (
                      <InvestmentFutureComparison
                        currentPace={futures.current}
                        followingPlan={futures.plan}
                        hasBehaviorHistory={dashboard.pace.hasSufficientHistory}
                      />
                    )}
                    <InvestmentScenarioLab
                      draft={scenario}
                      result={scenarioState.result}
                      dirty={Boolean(scenarioOverride)}
                      canApply={scenarioCanApply}
                      applyBlockedReason={scenarioApplyBlockedReason}
                      applying={actionPending}
                      conservativeReturn={revision.annualReturnConservative}
                      today={today}
                      onChange={setScenarioOverride}
                      onReset={() => setScenarioOverride(null)}
                      onApply={() => {
                        void applyScenario();
                      }}
                    />
                    <div className="grid gap-5 xl:grid-cols-2">
                      <InvestmentRouteBreakdown model={breakdown} />
                      <InvestmentLogbook entries={logbook} />
                    </div>
                  </>
                )}
                <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4 text-xs">
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() => {
                      void finishPlan("archive");
                    }}
                    className="min-h-11 rounded-lg px-3 font-semibold text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                  >
                    Arquivar plano
                  </button>
                  {dashboard.status.status === "completed" && (
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() => {
                        void finishPlan("complete");
                      }}
                      className="min-h-11 rounded-lg px-3 font-semibold text-emerald-300 hover:bg-emerald-300/[0.08]"
                    >
                      Marcar destino como concluído
                    </button>
                  )}
                </div>
              </>
            ))}

      {!routeLoadError &&
        !movementsLoadError &&
        routeSchemaReady &&
        (!plan || !revision) &&
        hasInactivePlanHistory && <InvestmentLogbook entries={logbook} />}

      {!movementsLoadError && (
        <InvestmentMovements
          data={{ contributions, snapshots, withdrawals }}
          onAddContribution={openContribution}
          onAddWithdrawal={() =>
            setMovementDialog({ kind: "withdrawal", item: null })
          }
          onCheckin={openCheckin}
          onEditContribution={(item) =>
            setMovementDialog({ kind: "contribution", item })
          }
          onDeleteContribution={(item) => {
            void runDelete("contribution", item);
          }}
          onEditWithdrawal={(item) =>
            setMovementDialog({ kind: "withdrawal", item })
          }
          onDeleteWithdrawal={(item) => {
            void runDelete("withdrawal", item);
          }}
        />
      )}

      <InvestmentPlanDialog
        open={planDialog != null}
        mode={planDialog ?? "create"}
        today={today}
        initial={planInitial}
        onClose={() => setPlanDialog(null)}
        onSubmit={submitPlan}
        onSuccess={refreshWithNotice}
      />
      {!movementsLoadError && (
        <InvestmentCheckinDialog
          open={checkinOpen}
          today={today}
          initialDate={latest?.date === today ? today : undefined}
          initialValue={latest?.date === today ? latest.totalValue : null}
          initialNotes={latest?.date === today ? latest.notes : null}
          snapshots={snapshots}
          contributions={contributions}
          withdrawals={withdrawals}
          onClose={() => setCheckinOpen(false)}
          onSubmit={fazerCheckinInvestimento}
          onSuccess={refreshWithNotice}
          onAddContribution={openContribution}
          onAddWithdrawal={() =>
            setMovementDialog({ kind: "withdrawal", item: null })
          }
        />
      )}
      {!movementsLoadError && contributionWriteReady && (
        <InvestmentMovementDialog
          open={movementDialog?.kind === "contribution"}
          kind="contribution"
          today={today}
          item={
            movementDialog?.kind === "contribution" ? movementDialog.item : null
          }
          onClose={() => setMovementDialog(null)}
          onSubmit={(data) =>
            movementDialog?.kind === "contribution" && movementDialog.item
              ? editarAporteInvestimento(movementDialog.item.id, data)
              : registrarAporteInvestimento(data)
          }
          onSuccess={refreshWithNotice}
        />
      )}
      {!movementsLoadError && (
        <InvestmentMovementDialog
          open={movementDialog?.kind === "withdrawal"}
          kind="withdrawal"
          today={today}
          item={
            movementDialog?.kind === "withdrawal" ? movementDialog.item : null
          }
          onClose={() => setMovementDialog(null)}
          onSubmit={(data) =>
            movementDialog?.kind === "withdrawal" && movementDialog.item
              ? editarRetiradaInvestimento(movementDialog.item.id, data)
              : registrarRetiradaInvestimento(data)
          }
          onSuccess={refreshWithNotice}
        />
      )}
    </section>
  );
}

function latestSnapshot(
  snapshots: PortfolioSnapshot[],
): PortfolioSnapshot | null {
  return [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}
function latestRevision(
  revisions: InvestmentPlanRevision[],
): InvestmentPlanRevision | null {
  return [...revisions].sort((a, b) => b.version - a.version)[0] ?? null;
}
function mergePlanHistory(
  history: InvestmentPlanHistoryItem[],
  activePlan: InvestmentPlan | null,
): InvestmentPlanHistoryItem[] {
  const plans = new Map(history.map((item) => [item.id, item]));
  if (activePlan)
    plans.set(activePlan.id, { ...plans.get(activePlan.id), ...activePlan });
  return [...plans.values()];
}
function mergeRevisionHistory(
  history: InvestmentPlanRevision[],
  activeRevisions: InvestmentPlanRevision[],
): InvestmentPlanRevision[] {
  const revisions = new Map(history.map((item) => [item.id, item]));
  activeRevisions.forEach((item) => revisions.set(item.id, item));
  return [...revisions.values()];
}
function addYears(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetYear = year + years;
  const lastDay = new Date(Date.UTC(targetYear, month, 0, 12)).getUTCDate();
  return `${String(targetYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
function nextMonthStart(date: string): string {
  const value = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

function toEngineScenario(draft: ScenarioDraft): InvestmentScenarioDraft {
  return {
    monthlyContribution: draft.monthlyContribution,
    oneTimeContribution:
      draft.oneTimeContribution > 0
        ? {
            date: draft.oneTimeContributionDate,
            amount: draft.oneTimeContribution,
          }
        : null,
    pauseMonths: draft.pauseMonths,
    futureWithdrawal:
      draft.futureWithdrawal > 0
        ? { date: draft.futureWithdrawalDate, amount: draft.futureWithdrawal }
        : null,
    targetDate: draft.targetDate,
    targetValue: draft.targetValue,
    annualRate: draft.annualReturn,
  };
}

function hasPersistableScenarioChanges(
  draft: ScenarioDraft,
  revision: InvestmentPlanRevision,
): boolean {
  const targetDate = safeNormalizeTargetDate(draft.targetDate);
  return (
    Math.abs(draft.monthlyContribution - revision.plannedMonthlyContribution) >
      0.005 ||
    Math.abs(draft.targetValue - revision.targetValue) > 0.005 ||
    targetDate == null || targetDate !== normalizeTargetDate(revision.targetDate) ||
    Math.abs(draft.annualReturn - revision.annualReturnBase) > 1e-10
  );
}

function safeNormalizeTargetDate(value: string): string | null {
  try {
    return normalizeTargetDate(value);
  } catch {
    return null;
  }
}

function formatAnnualRate(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

function mapTrajectoryPoints(
  points: InvestmentRouteDashboard["trajectory"]["points"],
  dashboard: InvestmentRouteDashboard | null,
  today: string,
): RouteProjectionPoint[] {
  return points.map((point) => ({
    date: point.date,
    label: dateLabel(point.date),
    actual: point.actual,
    estimated:
      dashboard?.currentValue?.isEstimated &&
      (point.date === dashboard.currentValue.date || point.date === today)
        ? point.date === dashboard.currentValue.date
          ? dashboard.currentValue.observed
          : dashboard.currentValue.estimated
        : null,
    originalPlan: point.originalPlan,
    currentPlan: point.currentPlan,
    currentRoute: point.routeBase,
    conservative: point.routeConservative,
    favorable: point.routeFavorable,
    simulation: point.simulation,
  }));
}

function mapStatus(
  status: InvestmentRouteDashboard["status"]["status"],
): RouteStatusKey {
  return status === "configuration_required" ? "insufficient_data" : status;
}
function mapQuality(dashboard: InvestmentRouteDashboard): RouteQualityKey {
  if (dashboard.currentValue?.isEstimated) return "estimated";
  if (dashboard.dataQuality.level === "current") return "current";
  if (dashboard.dataQuality.level === "stale") return "stale";
  return "insufficient";
}

function buildHeroModel(
  dashboard: InvestmentRouteDashboard,
  revision: InvestmentPlanRevision,
): RouteHeroModel {
  const current = dashboard.currentValue?.estimated ?? null;
  return {
    status: mapStatus(dashboard.status.status),
    quality: mapQuality(dashboard),
    title: dashboard.plan?.name || "Meu destino financeiro",
    targetValue: revision.targetValue,
    targetDate: normalizeTargetDate(revision.targetDate),
    currentValue: current,
    currentIsEstimated: Boolean(dashboard.currentValue?.isEstimated),
    progressPercent:
      current == null ? null : (current / revision.targetValue) * 100,
    projectedBase: dashboard.projections.base,
    projectedLow: dashboard.projections.conservative,
    projectedHigh: dashboard.projections.favorable,
    requiredMonthlyContribution: dashboard.requiredMonthlyContribution,
    planDifference:
      dashboard.requiredMonthlyContribution == null
        ? null
        : dashboard.requiredMonthlyContribution -
          revision.plannedMonthlyContribution,
    explanation: statusExplanation(dashboard),
    valueModeLabel:
      revision.valueMode === "real"
        ? "Valores reais em poder de compra"
        : "Valores nominais na data-alvo",
    referenceDate: revision.valueReferenceDate,
    realConversionApproximate: revision.valueMode === "real",
    scheduledEffectiveFrom:
      dashboard.currentRevision?.id === revision.id
        ? null
        : revision.effectiveFrom,
  };
}

function statusExplanation(dashboard: InvestmentRouteDashboard): string {
  const values = dashboard.status.explanationValues;
  if (dashboard.status.status === "update_required")
    return values.snapshotAgeDays == null
      ? "Faça o primeiro check-in para posicionar sua carteira e iniciar a projeção."
      : `O último check-in tem ${values.snapshotAgeDays} dias. Atualize o valor para recuperar uma leitura confiável.`;
  if (dashboard.status.status === "calculating")
    return `Ainda estamos formando seu ritmo real: há ${values.eligiblePaceMonths} de 3 meses encerrados necessários.`;
  if (dashboard.status.status === "completed") {
    const current = dashboard.currentValue?.estimated ?? null;
    const target = values.targetValue;
    return current == null || target == null
      ? "O destino foi alcançado com os dados disponíveis."
      : `${money(current)} já alcança a meta de ${money(target)}, uma diferença de ${money(current - target)}. Você pode concluir este destino.`;
  }
  if (dashboard.status.status === "insufficient_data")
    return "Os dados ou as premissas atuais não permitem atribuir um status seguro à rota.";
  if (
    values.projectedValue == null ||
    values.targetValue == null ||
    values.coverage == null
  )
    return "A projeção está temporariamente indisponível.";
  const pace =
    values.contributionPace == null
      ? "ritmo ainda provisório"
      : `ritmo médio de ${money(values.contributionPace)} por mês`;
  const coverage = new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(values.coverage);
  const correction =
    values.requiredMonthlyContribution == null
      ? ""
      : ` O aporte estimado para buscar a meta é ${money(values.requiredMonthlyContribution)} por mês.`;
  const base = `Com ${pace}, o cenário-base projeta ${money(values.projectedValue)}, equivalente a ${coverage} da meta.${correction}`;
  if (
    (dashboard.status.status === "attention" ||
      dashboard.status.status === "off_track") &&
    values.requiredMonthlyContribution != null &&
    values.contributionPace != null
  ) {
    return `${base} A diferença entre o ritmo observado e o aporte necessário é ${money(values.requiredMonthlyContribution - values.contributionPace)} por mês.`;
  }
  if (
    dashboard.status.status === "ahead" ||
    dashboard.status.status === "on_track"
  ) {
    if (dashboard.dataQuality.level === "stale")
      return `${base} O último check-in tem ${values.snapshotAgeDays ?? "mais de 35"} dias; atualize a carteira agora para confirmar essa leitura.`;
    const nextCheckin = dashboard.dataQuality.latestSnapshot
      ? addDays(dashboard.dataQuality.latestSnapshot.date, 35)
      : null;
    return `${base} Mantenha a consistência${nextCheckin ? ` e faça o próximo check-in até ${dateLabel(nextCheckin)}` : ""}.`;
  }
  return base;
}

function buildMonthlyAction(
  dashboard: InvestmentRouteDashboard,
  revision: InvestmentPlanRevision,
  today: string,
): MonthlyActionModel {
  const point =
    dashboard.adherence.months.find((item) => item.isCurrentMonth) ?? null;
  const planned = point ? point.planned : revision.plannedMonthlyContribution;
  const contributed = point?.contributed ?? 0;
  const remaining =
    point?.remaining ??
    (planned == null ? 0 : Math.max(0, planned - contributed));
  const excess =
    point?.excess ?? (planned == null ? 0 : Math.max(0, contributed - planned));
  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${today.slice(0, 7)}-01T12:00:00Z`));
  const message =
    planned == null || planned <= 0
      ? "Sem meta mensal para este período."
      : excess > 0
        ? `Você aportou ${money(excess)} acima do planejado neste mês.`
        : remaining > 0
          ? `Faltam ${money(remaining)} para completar o aporte planejado de ${monthName}.`
          : "O aporte planejado deste mês já foi completado.";
  return {
    monthLabel: monthName,
    planned,
    contributed,
    remaining,
    excess,
    progressPercent:
      planned != null && planned > 0 ? (contributed / planned) * 100 : null,
    impact: null,
    message,
  };
}

function computeMonthlyImpact(
  dashboard: InvestmentRouteDashboard | null,
  revision: InvestmentPlanRevision | null,
  today: string,
  monthly: MonthlyActionModel | null,
): number | null {
  if (
    !dashboard?.currentValue ||
    !dashboard.dataQuality.canProject ||
    !revision ||
    !monthly ||
    monthly.remaining <= 0 ||
    normalizeTargetDate(revision.targetDate) <= today
  )
    return null;
  try {
    const monthlyContribution = dashboard.pace.hasSufficientHistory
      ? (dashboard.pace.monthlyAverage ?? revision.plannedMonthlyContribution)
      : revision.plannedMonthlyContribution;
    const base = simulateInvestmentScenario({
      revision,
      anchorDate: today,
      anchorValue: dashboard.currentValue.estimated,
      draft: { monthlyContribution },
    });
    const completed = simulateInvestmentScenario({
      revision,
      anchorDate: today,
      anchorValue: dashboard.currentValue.estimated,
      draft: {
        monthlyContribution,
        oneTimeContribution: {
          date: addDays(today, 1),
          amount: monthly.remaining,
        },
      },
    });
    return completed.projectedValue - base.projectedValue;
  } catch {
    return null;
  }
}

function buildFutures(
  dashboard: InvestmentRouteDashboard | null,
  revision: InvestmentPlanRevision | null,
  today: string,
): { current: FutureModel; plan: FutureModel } | null {
  if (!dashboard || !dashboard.dataQuality.canProject || !revision) return null;
  const quality = dashboard.currentValue?.isEstimated
    ? "Estimativa desde o último check-in"
    : dashboard.dataQuality.level === "stale"
      ? "Dado desatualizado"
      : dashboard.dataQuality.level === "current"
        ? "Dado atual"
        : "Dados insuficientes";
  const pace = dashboard.pace.hasSufficientHistory
    ? dashboard.pace.monthlyAverage
    : null;
  const anchor = dashboard.currentValue?.estimated ?? null;
  const currentReach =
    anchor != null && pace != null
      ? reachProjection(anchor, pace, revision, today)
      : null;
  const planReach =
    anchor != null
      ? reachProjection(
          anchor,
          revision.plannedMonthlyContribution,
          revision,
          today,
        )
      : null;
  const currentValue = dashboard.projections.base;
  const planValue = dashboard.projections.followingPlan;
  return {
    current: {
      title: "Mantendo seu ritmo",
      description: "Continua com a média dos últimos meses encerrados.",
      monthlyContribution: pace,
      projectedValue: currentValue,
      targetDifference:
        currentValue == null ? null : currentValue - revision.targetValue,
      reachDate: currentReach?.reachedAt ?? null,
      monthDifference: currentReach?.reachedAt
        ? monthsBetweenDates(
            normalizeTargetDate(revision.targetDate),
            normalizeTargetDate(currentReach.reachedAt),
          )
        : null,
      qualityLabel: quality,
    },
    plan: {
      title: "Seguindo o plano",
      description: "Usa o aporte mensal definido na revisão vigente.",
      monthlyContribution: revision.plannedMonthlyContribution,
      projectedValue: planValue,
      targetDifference:
        planValue == null ? null : planValue - revision.targetValue,
      reachDate: planReach?.reachedAt ?? null,
      monthDifference: planReach?.reachedAt
        ? monthsBetweenDates(
            normalizeTargetDate(revision.targetDate),
            normalizeTargetDate(planReach.reachedAt),
          )
        : null,
      qualityLabel: quality,
    },
  };
}

function reachProjection(
  initialBalance: number,
  monthlyContribution: number,
  revision: InvestmentPlanRevision,
  today: string,
) {
  return projectPortfolio({
    initialBalance,
    annualRate: revision.annualReturnBase,
    startDate: today,
    months: MAX_REACH_MONTHS,
    monthlyContribution,
    targetValue: revision.targetValue,
  });
}

function buildBreakdown(
  dashboard: InvestmentRouteDashboard | null,
  revisions: InvestmentPlanRevision[],
): RouteBreakdownModel | null {
  const value = dashboard?.latestBreakdown;
  if (!value) return null;
  const routeRevision = dashboard.routeRevision ?? dashboard.currentRevision;
  const ordered = revisions
    .filter((item) => !dashboard.plan || item.planId === dashboard.plan.id)
    .sort((a, b) => a.version - b.version);
  const relevant =
    [...ordered]
      .filter(
        (item) =>
          item.effectiveFrom >= value.startDate &&
          item.effectiveFrom <= value.endDate,
      )
      .sort((a, b) => b.version - a.version)[0] ?? null;
  const previous = relevant
    ? ([...ordered].reverse().find((item) => item.version < relevant.version) ??
      null)
    : null;
  const planChange = relevant
    ? `${describeRevisionChanges(relevant, previous).join("; ") || "revisão registrada sem alteração financeira"}. Vigência em ${dateLabel(relevant.effectiveFrom)}.`
    : null;
  const valueModeNote =
    routeRevision?.valueMode === "real"
      ? `Os check-ins e esta decomposição usam valores nominais observados. Eles não foram convertidos para o eixo da rota, expresso em poder de compra de ${dateLabel(routeRevision.valueReferenceDate)}.`
      : "A decomposição usa os valores nominais observados em cada check-in.";
  return {
    from: value.startDate,
    to: value.endDate,
    initialValue: value.initialValue,
    finalValue: value.finalValue,
    contributions: value.contributions,
    withdrawals: value.withdrawals,
    residual: value.residualResult,
    totalChange: value.totalVariation,
    modifiedDietzReturn: dashboard.modifiedDietzReturn,
    valueModeNote,
    planChange,
  };
}

function buildLogbook(
  plans: InvestmentPlanHistoryItem[],
  revisions: InvestmentPlanRevision[],
  snapshots: PortfolioSnapshot[],
  contributions: InvestmentContribution[],
  withdrawals: InvestmentWithdrawalRow[],
): LogbookEntry[] {
  const planNames = new Map(plans.map((item) => [item.id, item.name]));
  const orderedByPlan = new Map<string, InvestmentPlanRevision[]>();
  revisions.forEach((item) =>
    orderedByPlan.set(item.planId, [
      ...(orderedByPlan.get(item.planId) ?? []),
      item,
    ]),
  );
  orderedByPlan.forEach((items) => items.sort((a, b) => a.version - b.version));
  const entries: LogbookEntry[] = [
    ...snapshots.map((item) => ({
      id: `snapshot-${item.id}`,
      date: item.date,
      kind: "checkin" as const,
      title: "Check-in da carteira",
      summary: `Valor atualizado para ${money(item.totalValue)}. A rota foi recalculada.`,
      details: item.notes,
    })),
    ...contributions.map((item) => ({
      id: `contribution-${item.id}`,
      date: item.date,
      kind: "contribution" as const,
      title: "Aporte registrado",
      summary: `${money(item.amount)}${item.institution ? ` em ${item.institution}` : ""}.`,
      details: item.notes,
    })),
    ...withdrawals.map((item) => ({
      id: `withdrawal-${item.id}`,
      date: item.date,
      kind: "withdrawal" as const,
      title: "Retirada registrada",
      summary: `${money(item.amount)}${item.institution ? ` de ${item.institution}` : ""}.`,
      details: item.notes,
    })),
    ...revisions.map((item) => {
      const previous =
        orderedByPlan
          .get(item.planId)
          ?.find((candidate) => candidate.version === item.version - 1) ?? null;
      const planName = planNames.get(item.planId) || "Destino financeiro";
      const changes = describeRevisionChanges(item, previous);
      const summary =
        item.version === 1
          ? `${planName}: meta de ${money(item.targetValue)} para ${dateLabel(normalizeTargetDate(item.targetDate))}, com aporte de ${money(item.plannedMonthlyContribution)} por mês. Vigência em ${dateLabel(item.effectiveFrom)}.`
          : `${planName}: ${changes.join("; ") || "revisão registrada sem alteração financeira"}. Vigência em ${dateLabel(item.effectiveFrom)}.`;
      return {
        id: `revision-${item.id}`,
        date: item.createdAt
          ? timestampDateInBahia(item.createdAt)
          : item.effectiveFrom,
        kind: "plan" as const,
        title:
          item.version === 1
            ? "Plano criado"
            : `Plano ajustado · revisão ${item.version}`,
        summary,
        details: [
          item.changeNote ? `Motivo registrado: ${item.changeNote}` : null,
          revisionAssumptionsDetails(item),
        ]
          .filter(Boolean)
          .join(" "),
      };
    }),
    ...plans.flatMap((item): LogbookEntry[] => {
      if (item.completedAt)
        return [
          {
            id: `plan-completed-${item.id}`,
            date: timestampDateInBahia(item.completedAt),
            kind: "plan",
            title: "Destino concluído",
            summary: `${item.name} foi marcado como concluído. O plano e suas revisões permanecem preservados.`,
          },
        ];
      if (item.archivedAt)
        return [
          {
            id: `plan-archived-${item.id}`,
            date: timestampDateInBahia(item.archivedAt),
            kind: "plan",
            title: "Plano arquivado",
            summary: `${item.name} deixou de ser o destino ativo, sem apagar seu histórico.`,
          },
        ];
      return [];
    }),
  ];
  return entries.sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}

function revisionAssumptionsDetails(item: InvestmentPlanRevision): string {
  const mode =
    item.valueMode === "real"
      ? `valores reais em poder de compra de ${dateLabel(item.valueReferenceDate)}`
      : "valores nominais";
  return `Premissas completas: vigência em ${dateLabel(item.effectiveFrom)}; ponto de partida de ${money(item.baselineValue)} em ${dateLabel(item.baselineDate)}; destino de ${money(item.targetValue)} em ${dateLabel(normalizeTargetDate(item.targetDate))}; aporte mensal de ${money(item.plannedMonthlyContribution)}; taxas anuais líquidas conservadora ${formatAnnualRate(item.annualReturnConservative)}, base ${formatAnnualRate(item.annualReturnBase)} e favorável ${formatAnnualRate(item.annualReturnFavorable)}; inflação ${formatAnnualRate(item.annualInflation)}; ${mode}.`;
}

function describeRevisionChanges(
  current: InvestmentPlanRevision,
  previous: InvestmentPlanRevision | null,
): string[] {
  if (!previous) return [];
  const changes: string[] = [];
  if (moneyChanged(previous.targetValue, current.targetValue))
    changes.push(
      `meta ${money(previous.targetValue)} → ${money(current.targetValue)}`,
    );
  if (
    normalizeTargetDate(previous.targetDate) !==
    normalizeTargetDate(current.targetDate)
  )
    changes.push(
      `prazo ${dateLabel(normalizeTargetDate(previous.targetDate))} → ${dateLabel(normalizeTargetDate(current.targetDate))}`,
    );
  if (
    moneyChanged(
      previous.plannedMonthlyContribution,
      current.plannedMonthlyContribution,
    )
  )
    changes.push(
      `aporte mensal ${money(previous.plannedMonthlyContribution)} → ${money(current.plannedMonthlyContribution)}`,
    );
  if (
    moneyChanged(previous.baselineValue, current.baselineValue) ||
    previous.baselineDate !== current.baselineDate
  )
    changes.push(
      `ponto de partida ${money(previous.baselineValue)} em ${dateLabel(previous.baselineDate)} → ${money(current.baselineValue)} em ${dateLabel(current.baselineDate)}`,
    );
  if (
    moneyChanged(
      previous.annualReturnConservative,
      current.annualReturnConservative,
    )
  )
    changes.push(
      `taxa conservadora ${formatAnnualRate(previous.annualReturnConservative)} → ${formatAnnualRate(current.annualReturnConservative)}`,
    );
  if (moneyChanged(previous.annualReturnBase, current.annualReturnBase))
    changes.push(
      `taxa-base ${formatAnnualRate(previous.annualReturnBase)} → ${formatAnnualRate(current.annualReturnBase)}`,
    );
  if (
    moneyChanged(previous.annualReturnFavorable, current.annualReturnFavorable)
  )
    changes.push(
      `taxa favorável ${formatAnnualRate(previous.annualReturnFavorable)} → ${formatAnnualRate(current.annualReturnFavorable)}`,
    );
  if (moneyChanged(previous.annualInflation, current.annualInflation))
    changes.push(
      `inflação ${formatAnnualRate(previous.annualInflation)} → ${formatAnnualRate(current.annualInflation)}`,
    );
  if (previous.valueMode !== current.valueMode)
    changes.push(
      `modo ${previous.valueMode === "real" ? "real" : "nominal"} → ${current.valueMode === "real" ? "real" : "nominal"}`,
    );
  if (previous.valueReferenceDate !== current.valueReferenceDate)
    changes.push(
      `data-base monetária ${dateLabel(previous.valueReferenceDate)} → ${dateLabel(current.valueReferenceDate)}`,
    );
  return changes;
}

function moneyChanged(left: number, right: number): boolean {
  return Math.abs(left - right) > 1e-8;
}

function timestampDateInBahia(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Bahia",
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function planFormInitial(
  plan: InvestmentPlan | null,
  revision: InvestmentPlanRevision | null,
  currentValue: number | null,
  latest: PortfolioSnapshot | null,
  today: string,
  allowImmediateRevision: boolean,
): InvestmentPlanFormValues {
  if (!revision)
    return {
      name: "",
      baselineDate: today,
      baselineValue: roundMoney(currentValue ?? Number.NaN),
      targetValue: Number.NaN,
      targetDate: normalizeTargetDate(addYears(today, 10)),
      valueMode: "real",
      valueReferenceDate: today,
      plannedMonthlyContribution: 0,
      annualReturnConservative: 0,
      annualReturnBase: 4,
      annualReturnFavorable: 7,
      annualInflation: 4,
      effectiveFrom: today,
      changeNote: "",
      allowImmediateRevision: false,
      baselineValueLocked: Boolean(latest),
      baselineDateLocked: true,
    };
  return {
    planId: plan?.id,
    expectedVersion: revision.version,
    name: plan?.name ?? "",
    baselineDate: today,
    baselineValue: roundMoney(currentValue ?? revision.baselineValue),
    targetValue: revision.targetValue,
    targetDate: revision.targetDate,
    valueMode: revision.valueMode,
    valueReferenceDate: revision.valueReferenceDate,
    plannedMonthlyContribution: revision.plannedMonthlyContribution,
    annualReturnConservative: revision.annualReturnConservative * 100,
    annualReturnBase: revision.annualReturnBase * 100,
    annualReturnFavorable: revision.annualReturnFavorable * 100,
    annualInflation: revision.annualInflation * 100,
    effectiveFrom: nextMonthStart(today),
    changeNote: "",
    allowImmediateRevision,
    baselineValueLocked: true,
    baselineDateLocked: true,
  };
}

function revisionFormData(
  plan: InvestmentPlan,
  revision: InvestmentPlanRevision,
  scenario: ScenarioDraft,
  today: string,
  currentValue: number | null,
): FormData {
  const data = new FormData();
  data.set("name", plan.name);
  data.set("baseline_date", today);
  data.set(
    "baseline_value",
    String(roundMoney(currentValue ?? revision.baselineValue)),
  );
  data.set("expected_version", String(revision.version));
  data.set("target_value", String(scenario.targetValue));
  data.set("target_date", scenario.targetDate);
  data.set("value_mode", revision.valueMode);
  data.set("value_reference_date", revision.valueReferenceDate);
  data.set(
    "planned_monthly_contribution",
    String(scenario.monthlyContribution),
  );
  data.set(
    "annual_return_conservative",
    String(revision.annualReturnConservative * 100),
  );
  data.set("annual_return_base", String(scenario.annualReturn * 100));
  data.set(
    "annual_return_favorable",
    String(revision.annualReturnFavorable * 100),
  );
  data.set("annual_inflation", String(revision.annualInflation * 100));
  data.set("effective_from", nextMonthStart(today));
  data.set(
    "change_note",
    `Simulação aplicada: aporte mensal ${money(scenario.monthlyContribution)}, meta ${money(scenario.targetValue)} em ${dateLabel(normalizeTargetDate(scenario.targetDate))} e taxa-base ${formatAnnualRate(scenario.annualReturn)}.`,
  );
  return data;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPersistableMoney(value: number, allowZero: boolean): boolean {
  return (
    Number.isFinite(value) &&
    value <= 999_999_999_999.99 &&
    (allowZero ? value >= 0 : value > 0) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7
  );
}
