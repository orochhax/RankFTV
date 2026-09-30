export type BracketSlot = "a" | "b";

export type ProgressionMatch = {
  id: string;
  round_index: number;
  match_index: number;
  bracket_section: string | null;
  is_third_place: boolean | null;
  winner_participant_id: string | null;
  next_winner_match_id: string | null;
  next_winner_slot: string | null;
  next_loser_match_id: string | null;
  next_loser_slot: string | null;
};

export type InvalidationStep = {
  matchId: string;
  slots: BracketSlot[];
};

type ProgressionEdge = {
  matchId: string;
  slot: BracketSlot;
};

function validSlot(value: string | null): value is BracketSlot {
  return value === "a" || value === "b";
}

function outgoingEdges(match: ProgressionMatch, matches: ProgressionMatch[]): ProgressionEdge[] {
  const edges: ProgressionEdge[] = [];

  if (match.next_winner_match_id && validSlot(match.next_winner_slot)) {
    edges.push({ matchId: match.next_winner_match_id, slot: match.next_winner_slot });
  }
  if (match.next_loser_match_id && validSlot(match.next_loser_slot)) {
    edges.push({ matchId: match.next_loser_match_id, slot: match.next_loser_slot });
  }
  if (edges.length > 0) return edges;

  // Compatibilidade com chaves simples antigas, criadas antes dos vínculos
  // explícitos entre partidas. A posição par alimenta A; a ímpar alimenta B.
  if (match.bracket_section !== "winners" || match.is_third_place) return edges;
  const nextMatch = matches.find((candidate) =>
    candidate.bracket_section === "winners" &&
    !candidate.is_third_place &&
    candidate.round_index === match.round_index + 1 &&
    candidate.match_index === Math.floor(match.match_index / 2),
  );
  if (!nextMatch) return edges;

  const slot: BracketSlot = match.match_index % 2 === 0 ? "a" : "b";
  edges.push({ matchId: nextMatch.id, slot });

  const nextRoundMatches = matches.filter((candidate) =>
    candidate.bracket_section === "winners" &&
    !candidate.is_third_place &&
    candidate.round_index === match.round_index + 1,
  );
  if (nextRoundMatches.length === 1) {
    const thirdPlace = matches.find((candidate) =>
      candidate.is_third_place || candidate.bracket_section === "third_place",
    );
    if (thirdPlace) edges.push({ matchId: thirdPlace.id, slot });
  }

  return edges;
}

/**
 * Retorna todos os jogos que precisam perder resultado/participante quando o
 * vencedor de uma partida anterior é apagado ou trocado. Cada jogo aparece
 * uma vez, mesmo quando os dois lados dependem da mesma origem.
 */
export function buildBracketInvalidationPlan(
  matches: ProgressionMatch[],
  sourceMatchId: string,
): InvalidationStep[] {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const source = byId.get(sourceMatchId);
  if (!source) return [];

  const queue = [...outgoingEdges(source, matches)];
  const slotsByMatch = new Map<string, Set<BracketSlot>>();
  const expanded = new Set<string>();
  const orderedIds: string[] = [];

  while (queue.length > 0) {
    const edge = queue.shift()!;
    const destination = byId.get(edge.matchId);
    if (!destination) continue;

    let slots = slotsByMatch.get(destination.id);
    if (!slots) {
      slots = new Set<BracketSlot>();
      slotsByMatch.set(destination.id, slots);
      orderedIds.push(destination.id);
    }
    slots.add(edge.slot);

    // Só existe algo propagado adiante se o jogo dependente já tinha sido
    // concluído. Nesse caso, todos os descendentes também ficam inválidos.
    if (destination.winner_participant_id && !expanded.has(destination.id)) {
      expanded.add(destination.id);
      queue.push(...outgoingEdges(destination, matches));
    }
  }

  return orderedIds.map((matchId) => ({
    matchId,
    slots: [...slotsByMatch.get(matchId)!].sort(),
  }));
}
