export type CourtConfiguration = {
  totalCourts: number;
  primaryCourtNumber: number;
};

export type MatchCourtContext = {
  roundIndex: number;
  matchIndex: number;
  totalRounds: number;
  secondaryMatch?: boolean;
};

export function normalizeCourtConfiguration(input: CourtConfiguration): CourtConfiguration {
  const totalCourts = Math.min(32, Math.max(1, Math.floor(input.totalCourts) || 1));
  const primaryCourtNumber = Math.min(
    totalCourts,
    Math.max(1, Math.floor(input.primaryCourtNumber) || 1),
  );
  return { totalCourts, primaryCourtNumber };
}

export function courtNumberForMatch(
  configuration: CourtConfiguration,
  context: MatchCourtContext,
): number {
  const config = normalizeCourtConfiguration(configuration);
  const allCourts = Array.from({ length: config.totalCourts }, (_, index) => index + 1);
  const mainCourts = [config.primaryCourtNumber];
  const secondaryCourts = allCourts.filter((court) => court !== config.primaryCourtNumber);

  if (context.secondaryMatch) {
    const pool = secondaryCourts.length > 0 ? secondaryCourts : mainCourts;
    return pool[context.matchIndex % pool.length];
  }

  const isFinal = context.roundIndex === context.totalRounds - 1;
  if (isFinal) return config.primaryCourtNumber;

  const isSemifinal = context.roundIndex === context.totalRounds - 2;
  if (isSemifinal) return mainCourts[context.matchIndex % mainCourts.length];

  return allCourts[context.matchIndex % allCourts.length];
}
