import assert from "node:assert/strict";
import test from "node:test";
import {
  createDoubleEliminationPlan,
  doubleEliminationCountError,
  SUPPORTED_DOUBLE_ELIMINATION_COUNTS,
  type DoubleEliminationMatchPlan,
} from "./double-elimination";
import { courtNumberForMatch } from "./bracket-courts";

function orderedPlan(plan: DoubleEliminationMatchPlan[]) {
  return [...plan].sort((a, b) =>
    a.roundIndex - b.roundIndex || a.matchIndex - b.matchIndex,
  );
}

function simulateCompleteTournament(plan: DoubleEliminationMatchPlan[]) {
  const slots = new Map(plan.map((match) => [match.key, {
    a: match.participantAId,
    b: match.participantBId,
  }]));
  const losses = new Map(
    plan.flatMap((match) => [match.participantAId, match.participantBId])
      .filter((id): id is string => !!id)
      .map((id) => [id, 0]),
  );

  for (const match of orderedPlan(plan)) {
    const participants = slots.get(match.key)!;
    assert.ok(participants.a, `${match.key} ficou sem participante A`);
    assert.ok(participants.b, `${match.key} ficou sem participante B`);
    assert.notEqual(participants.a, participants.b, `${match.key} colocou a dupla contra ela mesma`);

    const winnerSlot = (match.roundIndex + match.matchIndex) % 2 === 0 ? "a" : "b";
    const winner = participants[winnerSlot];
    const loser = participants[winnerSlot === "a" ? "b" : "a"];
    if (match.key.startsWith("w-")) {
      assert.equal(losses.get(participants.a!), 0, `${match.key}.a chegou derrotado à chave superior`);
      assert.equal(losses.get(participants.b!), 0, `${match.key}.b chegou derrotado à chave superior`);
    } else if (match.section === "losers") {
      assert.equal(losses.get(participants.a!), 1, `${match.key}.a não chegou com uma derrota`);
      assert.equal(losses.get(participants.b!), 1, `${match.key}.b não chegou com uma derrota`);
    } else if (match.key.startsWith("semi-")) {
      assert.equal(losses.get(participants.a!), 0, `${match.key}.a não veio invicto da chave superior`);
      assert.equal(losses.get(participants.b!), 1, `${match.key}.b não veio da repescagem com uma derrota`);
    }
    losses.set(loser!, (losses.get(loser!) ?? 0) + 1);
    for (const [destinationKey, destinationSlot, participant] of [
      [match.nextWinnerKey, match.nextWinnerSlot, winner],
      [match.nextLoserKey, match.nextLoserSlot, loser],
    ] as const) {
      if (!destinationKey || !destinationSlot) continue;
      const destination = slots.get(destinationKey)!;
      assert.equal(destination[destinationSlot], null, `${destinationKey}.${destinationSlot} recebeu duas origens`);
      destination[destinationSlot] = participant;
    }
  }
}

test("16 duplas classificam duas pela principal e duas pela repescagem antes das semifinais", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.filter((match) => match.key.startsWith("w-")).length, 14);
  assert.equal(plan.filter((match) => match.section === "losers").length, 12);
  assert.equal(plan.filter((match) => match.key.startsWith("semi-")).length, 2);
  assert.equal(plan.filter((match) => match.key === "final").length, 1);
  assert.equal(plan.filter((match) => match.section === "third_place").length, 1);
  assert.equal(plan.length, 30);
});

test("os dois classificados superiores entram nas semifinais", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.find((match) => match.key === "w-2-0")?.nextWinnerKey, "semi-0");
  assert.equal(plan.find((match) => match.key === "w-2-1")?.nextWinnerKey, "semi-1");
});

test("os dois classificados da repescagem voltam cruzados para a fase principal", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.find((match) => match.key === "l-3-0")?.nextWinnerKey, "semi-1");
  assert.equal(plan.find((match) => match.key === "l-3-1")?.nextWinnerKey, "semi-0");
  assert.equal(plan.find((match) => match.key === "l-3-0")?.nextWinnerSlot, "b");
});

test("semifinais alimentam a final e a disputa de terceiro lugar", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 8 }, (_, index) => `p-${index}`));
  const semifinal = plan.find((match) => match.key === "semi-0");
  assert.equal(semifinal?.nextWinnerKey, "final");
  assert.equal(semifinal?.nextLoserKey, "third-place");
});

test("a mensagem de quantidade aceita somente as seis capacidades homologadas", () => {
  for (const count of SUPPORTED_DOUBLE_ELIMINATION_COUNTS) {
    assert.equal(doubleEliminationCountError(count), null);
  }
  for (const count of [0, 1, 7, 9, 12, 24, 255, 257]) {
    assert.match(doubleEliminationCountError(count) ?? "", /8, 16, 32, 64, 128 ou 256/);
    assert.throws(
      () => createDoubleEliminationPlan(Array.from({ length: count }, (_, index) => `p-${index}`)),
      /8, 16, 32, 64, 128 ou 256/,
    );
  }
});

for (const count of SUPPORTED_DOUBLE_ELIMINATION_COUNTS) {
  test(`${count} duplas têm todos os cruzamentos, decisões, números e quadras válidos`, () => {
    const participantIds = Array.from({ length: count }, (_, index) => `p-${index}`);
    const plan = createDoubleEliminationPlan(participantIds);
    const qualificationRounds = Math.log2(count) - 1;
    const loserRoundCount = 2 * qualificationRounds - 2;

    assert.equal(plan.length, 2 * count - 2);
    assert.equal(plan.filter((match) => match.key.startsWith("w-")).length, count - 2);
    assert.equal(plan.filter((match) => match.section === "losers").length, count - 4);
    assert.equal(plan.filter((match) => match.key.startsWith("semi-")).length, 2);
    assert.equal(plan.filter((match) => match.key === "final").length, 1);
    assert.equal(plan.filter((match) => match.key === "third-place").length, 1);
    assert.equal(new Set(plan.map((match) => match.key)).size, plan.length);

    const seededIds = plan.flatMap((match) =>
      [match.participantAId, match.participantBId].filter((id): id is string => !!id),
    );
    assert.deepEqual([...seededIds].sort(), [...participantIds].sort());

    const byKey = new Map(plan.map((match) => [match.key, match]));
    const inbound = new Map<string, Set<string>>();
    for (const match of plan) {
      for (const [destinationKey, destinationSlot] of [
        [match.nextWinnerKey, match.nextWinnerSlot],
        [match.nextLoserKey, match.nextLoserSlot],
      ] as const) {
        if (!destinationKey || !destinationSlot) continue;
        const destination = byKey.get(destinationKey);
        assert.ok(destination, `${match.key} aponta para jogo inexistente`);
        assert.ok(destination.roundIndex > match.roundIndex, `${match.key} cria ciclo no chaveamento`);
        const slots = inbound.get(destinationKey) ?? new Set<string>();
        assert.ok(!slots.has(destinationSlot), `${destinationKey}.${destinationSlot} tem duas origens`);
        slots.add(destinationSlot);
        inbound.set(destinationKey, slots);
      }
    }
    for (const match of plan.filter((item) => !item.key.startsWith("w-0-"))) {
      assert.deepEqual([...(inbound.get(match.key) ?? [])].sort(), ["a", "b"], `${match.key} não tem duas origens`);
    }

    const lastLoserRound = loserRoundCount - 1;
    assert.equal(byKey.get(`l-${lastLoserRound}-0`)?.nextWinnerKey, "semi-1");
    assert.equal(byKey.get(`l-${lastLoserRound}-1`)?.nextWinnerKey, "semi-0");

    const ordered = orderedPlan(plan);
    assert.ok(ordered.slice(0, count - 2).every((match) => match.key.startsWith("w-")));
    assert.ok(ordered.slice(count - 2, 2 * count - 6).every((match) => match.section === "losers"));
    assert.deepEqual(ordered.slice(2 * count - 6).map((match) => match.key), [
      "semi-0", "semi-1", "final", "third-place",
    ]);
    const grouped = new Map<number, DoubleEliminationMatchPlan[]>();
    for (const match of ordered) {
      const matches = grouped.get(match.roundIndex) ?? [];
      matches.push(match);
      grouped.set(match.roundIndex, matches);
    }
    for (const matches of grouped.values()) {
      assert.deepEqual(matches.map((match) => match.matchIndex), Array.from({ length: matches.length }, (_, index) => index));
    }

    for (const configuration of [
      { totalCourts: 1, primaryCourtNumber: 1 },
      { totalCourts: 3, primaryCourtNumber: 1 },
      { totalCourts: 4, primaryCourtNumber: 3 },
    ]) {
      const mainTotalRounds = Math.log2(count) + 1;
      for (const match of plan) {
        const secondaryMatch = match.section === "losers" || match.section === "third_place";
        const court = courtNumberForMatch(configuration, {
          roundIndex: match.sectionRoundIndex,
          matchIndex: match.matchIndex,
          totalRounds: mainTotalRounds,
          secondaryMatch,
        });
        assert.ok(court >= 1 && court <= configuration.totalCourts);
        if (configuration.totalCourts > 1 && secondaryMatch) {
          assert.notEqual(court, configuration.primaryCourtNumber);
        }
        if (match.key.startsWith("semi-") || match.key === "final") {
          assert.equal(court, configuration.primaryCourtNumber);
        }
      }
    }

    simulateCompleteTournament(plan);
  });
}
