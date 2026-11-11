export type CourtMatch = {
  id: string;
  courtLabel: string | null;
  scheduledAt: string | null;
  status: "scheduled" | "called" | "in_progress" | "finished";
};

/**
 * Normalizes a saved `court_label` so numeric/bare court names gain a "Quadra " prefix
 * without duplicating it when "Quadra ..." is already stored.
 */
export function formatCourtLabel(courtLabel: string | null | undefined): string | undefined {
  const trimmed = courtLabel?.trim();
  if (!trimmed) return undefined;
  if (/^quadra\b/i.test(trimmed)) return trimmed;
  return `Quadra ${trimmed}`;
}

export function courtConflicts(matches: CourtMatch[]) {
  const conflicts = new Set<string>();
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    if (!current?.courtLabel || current.status === "finished") continue;
    for (let otherIndex = index + 1; otherIndex < matches.length; otherIndex += 1) {
      const other = matches[otherIndex];
      if (!other || other.status === "finished" || other.courtLabel !== current.courtLabel) continue;
      if ((current.status === "in_progress" && other.status === "in_progress") || (current.scheduledAt && current.scheduledAt === other.scheduledAt)) {
        conflicts.add(current.id);
        conflicts.add(other.id);
      }
    }
  }
  return conflicts;
}
