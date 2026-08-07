export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskedCardLast4(value: string): string | null {
  const digits = normalizeCardNumber(value);
  return digits.length >= 12 ? digits.slice(-4) : null;
}

export function cooldownSecondsForDeclines(declines: number): number {
  if (declines >= 8) return 86_400;
  if (declines >= 5) return 3_600;
  if (declines >= 3) return 900;
  return 0;
}

export function cardAttemptLimitForScope(scope: "card" | "order" | "user" | "ip"): number {
  if (scope === "card") return 6;
  if (scope === "order") return 8;
  if (scope === "user") return 12;
  return 20;
}

export function cardAttemptExceedsLimit(
  scope: "card" | "order" | "user" | "ip",
  attemptsAfterIncrement: number,
): boolean {
  return attemptsAfterIncrement > cardAttemptLimitForScope(scope);
}

export function cardAttemptOutcomeFromError(ambiguous: boolean): "ambiguous" | "declined" {
  return ambiguous ? "ambiguous" : "declined";
}
