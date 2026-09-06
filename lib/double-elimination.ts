export type BracketFormat = "single_elimination" | "double_elimination";
export type BracketSection = "winners" | "losers" | "grand_final" | "reset_final" | "third_place";
export type BracketSlot = "a" | "b";

export type DoubleEliminationMatchPlan = {
  key: string;
  section: BracketSection;
  sectionRoundIndex: number;
  roundIndex: number;
  matchIndex: number;
  participantAId: string | null;
  participantBId: string | null;
  nextWinnerKey: string | null;
  nextWinnerSlot: BracketSlot | null;
  nextLoserKey: string | null;
  nextLoserSlot: BracketSlot | null;
};

function slotFor(index: number): BracketSlot {
  return index % 2 === 0 ? "a" : "b";
}

/**
 * Formato da referência do RankFTV: duas duplas classificam pela chave
 * superior e duas pela repescagem. As quatro voltam à fase principal para
 * semifinais cruzadas, final e disputa de terceiro lugar.
 */
export function createDoubleEliminationPlan(participantIds: Array<string | null>): DoubleEliminationMatchPlan[] {
  const n = participantIds.length;
  if (n < 8 || (n & (n - 1)) !== 0) {
    throw new Error("A repescagem exige ao menos 8 posições em potência de 2.");
  }

  const qualificationRounds = Math.log2(n) - 1;
  const losersRounds = 2 * qualificationRounds - 2;
  const semifinalSectionRound = qualificationRounds;
  const finalSectionRound = qualificationRounds + 1;
  const semifinalRound = qualificationRounds + losersRounds;
  const finalRound = semifinalRound + 1;
  const plans: DoubleEliminationMatchPlan[] = [];

  for (let round = 0; round < qualificationRounds; round += 1) {
    const count = n / 2 ** (round + 1);
    const qualificationRound = round === qualificationRounds - 1;
    for (let match = 0; match < count; match += 1) {
      plans.push({
        key: `w-${round}-${match}`,
        section: "winners",
        sectionRoundIndex: round,
        roundIndex: round,
        matchIndex: match,
        participantAId: round === 0 ? participantIds[match * 2] ?? null : null,
        participantBId: round === 0 ? participantIds[match * 2 + 1] ?? null : null,
        nextWinnerKey: qualificationRound ? `semi-${match}` : `w-${round + 1}-${Math.floor(match / 2)}`,
        nextWinnerSlot: qualificationRound ? "a" : slotFor(match),
        nextLoserKey: round === 0
          ? `l-0-${Math.floor(match / 2)}`
          : `l-${2 * round - 1}-${match}`,
        nextLoserSlot: round === 0 ? slotFor(match) : "b",
      });
    }
  }

  for (let round = 0; round < losersRounds; round += 1) {
    const stage = Math.floor(round / 2);
    const count = n / 2 ** (stage + 2);
    const lastRound = round === losersRounds - 1;
    for (let match = 0; match < count; match += 1) {
      const advancesOneToOne = round % 2 === 0;
      plans.push({
        key: `l-${round}-${match}`,
        section: "losers",
        sectionRoundIndex: round,
        roundIndex: qualificationRounds + round,
        matchIndex: match,
        participantAId: null,
        participantBId: null,
        nextWinnerKey: lastRound
          ? `semi-${1 - match}`
          : advancesOneToOne
            ? `l-${round + 1}-${match}`
            : `l-${round + 1}-${Math.floor(match / 2)}`,
        nextWinnerSlot: lastRound ? "b" : advancesOneToOne ? "a" : slotFor(match),
        nextLoserKey: null,
        nextLoserSlot: null,
      });
    }
  }

  for (let match = 0; match < 2; match += 1) {
    plans.push({
      key: `semi-${match}`,
      section: "winners",
      sectionRoundIndex: semifinalSectionRound,
      roundIndex: semifinalRound,
      matchIndex: match,
      participantAId: null,
      participantBId: null,
      nextWinnerKey: "final",
      nextWinnerSlot: slotFor(match),
      nextLoserKey: "third-place",
      nextLoserSlot: slotFor(match),
    });
  }

  plans.push({
    key: "final", section: "winners", sectionRoundIndex: finalSectionRound,
    roundIndex: finalRound, matchIndex: 0,
    participantAId: null, participantBId: null,
    nextWinnerKey: null, nextWinnerSlot: null, nextLoserKey: null, nextLoserSlot: null,
  });
  plans.push({
    key: "third-place", section: "third_place", sectionRoundIndex: 0,
    roundIndex: finalRound, matchIndex: 1,
    participantAId: null, participantBId: null,
    nextWinnerKey: null, nextWinnerSlot: null, nextLoserKey: null, nextLoserSlot: null,
  });

  return plans;
}
