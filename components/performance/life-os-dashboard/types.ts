"use client";

import { type Habit, type HabitLog } from "@/lib/performance";
import { type DashboardRange, type TaskOccurrence } from "@/lib/performance-dashboard";
import { type LifeCategory, type LifeEvent, type LifeGoal, type LifeInsight, type PortfolioSnapshot } from "@/lib/performance-life-os";
import { WeeklyReport } from "@/components/performance/RelatorioSemanal";
import { InvestmentContribution, StudyAssessmentAttempt, StudyAssessmentQuestion, StudyCheckProgress, StudyRoadmap, StudyRoadmapItem, StudyRoadmapModule, StudySessionMetadata } from "@/lib/performance-widgets";
import { ConsistencyStatus } from "@/lib/performance-analytics";
import { RoadmapDraftSummary, RoadmapGenerationJob } from "@/lib/study-roadmap-ai";
import { DailyLifeAnalysis } from "@/lib/daily-life-analysis";
import { InvestmentPlan, InvestmentPlanRevision } from "@/lib/investment-route";

export type ActivityRow = {
  id: string;
  title: string;
  date: string;
  area: string;
  type: string | null;
  durationMinutes: number | null;
  status: string;
  notes: string | null;
  muscleGroups: string[];
  studySession: StudySessionMetadata | null;
};
export type WithdrawalRow = {
  id: string;
  date: string;
  amount: number;
  institution: string | null;
  notes: string | null;
};
export type Profile = {
  altura_cm?: number | null;
  data_nascimento?: string | null;
  lado?: string | null;
  pe_dominante?: string | null;
  peso_meta?: number | null;
  rating_meta?: number | null;
  treinos_semana_meta?: number | null;
} | null;

export type AcademyWorkoutTemplate = {
  id: string;
  name: string;
  muscleGroups: string[];
};

export type LifeOSProps = {
  today: string;
  monday: string;
  userId: string;
  nome: string;
  username: string | null;
  fotoUrl: string | null;
  email: string;
  telefone: string | null;
  dataNascimento: string | null;
  profile: Profile;
  alturaCm: number | null;
  pesoAtual: number | null;
  habits: Habit[];
  allHabits: Habit[];
  logs: HabitLog[];
  valoresHoje: Record<string, number>;
  reportAtual: WeeklyReport | null;
  reportHistory: WeeklyReport[];
  weights: { data: string; peso_kg: number }[];
  ratings: { id: string; data: string; rating: number }[];
  matches: {
    id: string;
    data: string;
    parceiro: string | null;
    adversario: string | null;
    resultado: "vitoria" | "derrota";
    placar: string | null;
    obs: string | null;
  }[];
  trainings: {
    id: string;
    data: string;
    tipo: string;
    duracao_min: number | null;
    obs: string | null;
  }[];
  tests: {
    id: string;
    data: string;
    tipo_teste: string;
    valor: number;
    unidade: string | null;
  }[];
  events: LifeEvent[];
  activities: ActivityRow[];
  academyWorkoutTemplates: AcademyWorkoutTemplate[];
  goals: LifeGoal[];
  snapshots: PortfolioSnapshot[];
  investmentPlan: InvestmentPlan | null;
  investmentPlanRevisions: InvestmentPlanRevision[];
  investmentPlanHistory: InvestmentPlan[];
  investmentPlanRevisionHistory: InvestmentPlanRevision[];
  investmentRouteSchemaReady: boolean;
  investmentContributionWriteReady: boolean;
  investmentRouteLoadError: string | null;
  investmentMovementsLoadError: string | null;
  withdrawals: WithdrawalRow[];
  insights: LifeInsight[];
  categories: LifeCategory[];
  contributions: InvestmentContribution[];
  studyRoadmap: StudyRoadmap | null;
  studyRoadmaps: StudyRoadmap[];
  studyItems: StudyRoadmapItem[];
  studyModules: StudyRoadmapModule[];
  studyQuestions: StudyAssessmentQuestion[];
  studyAttempts: StudyAssessmentAttempt[];
  studyCheckProgress: StudyCheckProgress[];
  studyCheckProgressReady: boolean;
  studyDrafts: RoadmapDraftSummary[];
  studyGenerationJobs: RoadmapGenerationJob[];
  studyDraftsReady: boolean;
  studyEnhancementsReady: boolean;
  studyReferenceStandardReady: boolean;
  studyItCatalogReady: boolean;
  studyV2Ready: boolean;
  range: DashboardRange;
  taskOccurrences: TaskOccurrence[];
  consistency: ConsistencyStatus;
  dailyAnalysis: DailyLifeAnalysis | null;
  schemaReady: boolean;
};
