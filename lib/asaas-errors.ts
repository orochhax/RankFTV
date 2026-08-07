export function isAmbiguousAsaasFailure(status: number | null): boolean {
  return status == null
    || status === 408
    || status === 409
    || status === 429
    || status >= 500;
}
