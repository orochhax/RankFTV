export const CHECKOUT_TERMS_VERSION = "2026-09-08";
export const CHECKOUT_PRIVACY_VERSION = "2026-09-08";

export function hasCheckoutLegalConsent(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "1" || value === "true";
}

export function checkoutLegalConsentRecord(acceptedAt = new Date()) {
  return {
    terms_accepted_at: acceptedAt.toISOString(),
    terms_version: CHECKOUT_TERMS_VERSION,
    privacy_version: CHECKOUT_PRIVACY_VERSION,
  } as const;
}
