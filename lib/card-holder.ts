export function normalizeCardHolderPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isValidCardHolderPhone(value: string): boolean {
  const digits = normalizeCardHolderPhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function normalizeAddressComplement(value: string): string {
  return value.trim().slice(0, 60);
}
