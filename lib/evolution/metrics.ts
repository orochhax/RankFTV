import type { EvolutionScore, EvolutionScoreInput, StudySession, StudyWeekMetric } from "./types";

const DAY_MS = 86_400_000;

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function weekRange(value: string) {
  const date = parseIsoDate(value);
  const weekday = date.getUTCDay();
  const distanceFromMonday = weekday === 0 ? 6 : weekday - 1;
  const start = new Date(date.getTime() - distanceFromMonday * DAY_MS);
  return { start: formatIsoDate(start), end: formatIsoDate(new Date(start.getTime() + 6 * DAY_MS)) };
}

export function computeStudyWeek(
  sessions: StudySession[],
  asOf: string,
  dailyTargetMinutes = 120,
  weeklyTargetMinutes = 600,
  startDate?: string,
): StudyWeekMetric {
  const range = weekRange(asOf);
  const effectiveStart = startDate ?? range.start;
  const minutesByDate = new Map<string, number>();

  for (const session of sessions) {
    if (session.studyDate < range.start || session.studyDate > range.end || session.studyDate < effectiveStart || session.minutes <= 0) continue;
    minutesByDate.set(session.studyDate, (minutesByDate.get(session.studyDate) ?? 0) + session.minutes);
  }

  let outstandingDebtMinutes = 0;
  let totalMinutes = 0;
  const failedWeekdays: string[] = [];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(range.start, index);
    const minutes = minutesByDate.get(date) ?? 0;
    const isBeforeStart = date < effectiveStart;
    const isWeekday = index < 5 && !isBeforeStart;
    const targetMinutes = isWeekday ? dailyTargetMinutes : 0;
    const originalDeficitMinutes = isWeekday ? Math.max(0, targetMinutes - minutes) : 0;
    const availableExtra = isWeekday ? Math.max(0, minutes - targetMinutes) : minutes;
    const extraAppliedToDebtMinutes = Math.min(outstandingDebtMinutes, availableExtra);

    if (date <= asOf) {
      if (originalDeficitMinutes > 0) {
        failedWeekdays.push(date);
        outstandingDebtMinutes += originalDeficitMinutes;
      }
      outstandingDebtMinutes -= extraAppliedToDebtMinutes;
    }
    totalMinutes += minutes;

    return {
      date,
      minutes,
      targetMinutes,
      metDailyMinimum: isBeforeStart || !isWeekday || minutes >= dailyTargetMinutes,
      originalDeficitMinutes,
      extraAppliedToDebtMinutes,
    };
  });

  const elapsedWeekdays = days.filter((day, index) => index < 5 && day.date >= effectiveStart && day.date <= asOf);
  const dailyCompliance = elapsedWeekdays.length
    ? elapsedWeekdays.filter((day) => day.metDailyMinimum).length / elapsedWeekdays.length
    : 0;
  const weeklyProgress = Math.min(1, totalMinutes / weeklyTargetMinutes);

  return {
    weekStart: range.start,
    weekEnd: range.end,
    totalMinutes,
    targetMinutes: weeklyTargetMinutes,
    outstandingDebtMinutes,
    failedWeekdays,
    days,
    score: Math.round(((dailyCompliance + weeklyProgress) / 2) * 100),
  };
}

export function computeEvolutionScore(input: EvolutionScoreInput): EvolutionScore {
  const dataScience = Math.round(Math.min(100, Math.max(0, input.study.score)) * 0.5);
  const rochaTech = input.videoPublished ? 30 : 0;
  const trainingRatio = input.expectedTrainingDays > 0
    ? Math.min(1, input.trainingDays / input.expectedTrainingDays)
    : 1;
  const shapeRaw = trainingRatio * 70 + (input.weightLogged ? 30 : 0);
  const instaShape = Math.round(shapeRaw * 0.2);

  return { total: dataScience + rochaTech + instaShape, dataScience, rochaTech, instaShape };
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}
