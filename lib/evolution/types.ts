export type EvolutionSourceKind = "roadmap" | "rankftv";

export type StudySession = {
  id: string;
  studyDate: string;
  minutes: number;
  source: "manual" | "timer";
  startedAt?: string | null;
  endedAt?: string | null;
};

export type StudyDayMetric = {
  date: string;
  minutes: number;
  targetMinutes: number;
  metDailyMinimum: boolean;
  originalDeficitMinutes: number;
  extraAppliedToDebtMinutes: number;
};

export type StudyWeekMetric = {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  targetMinutes: number;
  outstandingDebtMinutes: number;
  failedWeekdays: string[];
  days: StudyDayMetric[];
  score: number;
};

export type EvolutionScoreInput = {
  study: StudyWeekMetric;
  videoPublished: boolean;
  trainingDays: number;
  expectedTrainingDays: number;
  weightLogged: boolean;
};

export type EvolutionScore = {
  total: number;
  dataScience: number;
  rochaTech: number;
  instaShape: number;
};

export type RoadmapTask = {
  id: string;
  label: string;
  kind: "aula" | "quiz" | "simulacao" | "entrega" | "outro";
  durationMinutes: number | null;
};

export type RoadmapCourse = {
  id: string;
  title: string;
  url: string;
  lessons: RoadmapTask[];
  durationSource?: "catalogo" | "estimativa";
};

export type RoadmapDay = {
  id: string;
  dayNumber: number;
  date: string;
  weekday: string;
  plannedMinutes: number;
  sections: Array<{ title: string; tasks: RoadmapTask[] }>;
  courses: RoadmapCourse[];
  phaseId?: string;
  phaseTitle?: string;
  kind?: "study" | "project" | "linkedin" | "holiday";
  projectSlug?: string;
  note?: string;
};

export type RoadmapSnapshot = {
  generatedAt: string;
  sourcePath: string;
  period: { start: string; end: string };
  totalBusinessDays: number;
  days: RoadmapDay[];
  totalPlannedMinutes?: number;
  phases?: Array<{ id: string; title: string; priority: string; description: string; start: string; end: string; days: number }>;
  holidays?: Array<{ date: string; name: string; scope: "nacional" | "estadual" | "municipal" }>;
  careerMilestones?: Array<{ id: string; afterDay: number; title: string; rationale: string; linkedinTitle: string }>;
  linkedinSkillMilestones?: Array<{ id: string; afterDay: number; skill: string; evidence: string }>;
};

export type RankPendingItem = {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  summary: string;
};

export type RankSnapshot = {
  generatedAt: string;
  sourcePath: string;
  updatedAt: string | null;
  progress: { percent: number; completed: number; total: number; remaining: number };
  items: RankPendingItem[];
};
