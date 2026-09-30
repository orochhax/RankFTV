export type AthleteCheckoutDraft = {
  version: 1;
  expiresAt: string;
  values: Record<string, string>;
  paymentMethod: "pix" | "cartao";
  useSameEmail: boolean;
};

const MAX_DRAFT_FIELDS = 40;
const MAX_FIELD_LENGTH = 500;

export function athleteCheckoutDraftStorageKey(championshipId: string, reservationId: string) {
  return `rankftv:athlete-checkout-draft:v1:${championshipId}:${reservationId}`;
}

function validValues(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= MAX_DRAFT_FIELDS
    && entries.every(([key, fieldValue]) => (
      key.length > 0
      && key.length <= 100
      && typeof fieldValue === "string"
      && fieldValue.length <= MAX_FIELD_LENGTH
    ));
}

export function parseAthleteCheckoutDraft(
  raw: string | null,
  expectedExpiresAt: string,
  now = Date.now(),
): AthleteCheckoutDraft | null {
  if (!raw) return null;

  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const draft = candidate as Partial<AthleteCheckoutDraft>;
    if (
      draft.version !== 1
      || draft.expiresAt !== expectedExpiresAt
      || Date.parse(draft.expiresAt) <= now
      || !validValues(draft.values)
      || (draft.paymentMethod !== "pix" && draft.paymentMethod !== "cartao")
      || typeof draft.useSameEmail !== "boolean"
    ) return null;
    return draft as AthleteCheckoutDraft;
  } catch {
    return null;
  }
}
