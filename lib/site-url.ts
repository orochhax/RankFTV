export const DEFAULT_SITE_URL = "https://www.rankftv.com";

export function resolveBaseUrl(
  value = process.env.NEXT_PUBLIC_BASE_URL,
  fallback = DEFAULT_SITE_URL,
): string {
  const fallbackUrl = normalizedHttpUrl(fallback) ?? DEFAULT_SITE_URL;
  return normalizedHttpUrl(value) ?? fallbackUrl;
}

function normalizedHttpUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}
