export const MAX_HOME_BANNERS = 8;
export const HOME_BANNER_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const HOME_BANNER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type HomeBanner = {
  id: string;
  imageUrl: string;
  alt: string;
  linkUrl: string | null;
  active: boolean;
};

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.includes("/storage/v1/object/public/page-images/")
    );
  } catch {
    return false;
  }
}

function normalizeLinkUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const link = value.trim();
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  try {
    const url = new URL(link);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeHomeBanners(value: unknown): HomeBanner[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const banners: HomeBanner[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const imageUrl = typeof candidate.imageUrl === "string" ? candidate.imageUrl.trim() : "";
    const alt = typeof candidate.alt === "string" ? candidate.alt.trim().slice(0, 160) : "";
    if (!id || seen.has(id) || !isAllowedImageUrl(imageUrl) || alt.length < 3) continue;

    seen.add(id);
    banners.push({
      id,
      imageUrl,
      alt,
      linkUrl: normalizeLinkUrl(candidate.linkUrl),
      active: candidate.active !== false,
    });
    if (banners.length === MAX_HOME_BANNERS) break;
  }
  return banners;
}

export function homeBannerStoragePath(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/page-images/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
