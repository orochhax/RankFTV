import { PUBLIC_FUNNEL_EVENTS, type PublicFunnelEvent } from "@/lib/public-funnel";

export type FunnelEventRow = {
  sessionId: string;
  eventName: PublicFunnelEvent;
  experienceVersion: string;
  occurredAt: string;
};

export type FunnelVersionReport = {
  version: string;
  sessions: number;
  stages: Array<{ event: PublicFunnelEvent; sessions: number; conversionPercent: number }>;
  completedSessions: number;
  completionPercent: number;
  medianCompletionMinutes: number | null;
};

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function buildFunnelReport(rows: FunnelEventRow[]): FunnelVersionReport[] {
  const versions = new Map<string, FunnelEventRow[]>();
  for (const row of rows) versions.set(row.experienceVersion, [...(versions.get(row.experienceVersion) ?? []), row]);

  return [...versions.entries()].map(([version, versionRows]) => {
    const sessions = new Map<string, FunnelEventRow[]>();
    for (const row of versionRows) sessions.set(row.sessionId, [...(sessions.get(row.sessionId) ?? []), row]);
    const sessionCount = sessions.size;
    const stages = PUBLIC_FUNNEL_EVENTS.map((event) => {
      const reached = [...sessions.values()].filter((events) => events.some((item) => item.eventName === event)).length;
      return { event, sessions: reached, conversionPercent: sessionCount ? Math.round((reached / sessionCount) * 1000) / 10 : 0 };
    });
    const completionTimes = [...sessions.values()].flatMap((events) => {
      const started = events.find((event) => event.eventName === "championship_viewed");
      const completed = events.find((event) => event.eventName === "payment_confirmed");
      if (!started || !completed) return [];
      const duration = (Date.parse(completed.occurredAt) - Date.parse(started.occurredAt)) / 60_000;
      return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
    });
    const completedSessions = stages.find((stage) => stage.event === "payment_confirmed")?.sessions ?? 0;
    const completionMedian = median(completionTimes);
    return {
      version,
      sessions: sessionCount,
      stages,
      completedSessions,
      completionPercent: sessionCount ? Math.round((completedSessions / sessionCount) * 1000) / 10 : 0,
      medianCompletionMinutes: completionMedian == null ? null : Math.round(completionMedian * 10) / 10,
    };
  });
}
