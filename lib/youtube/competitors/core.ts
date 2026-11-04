/* eslint-disable no-control-regex -- nomes de arquivos precisam remover caracteres de controle do Windows */
import type { CompetitorRecord, CompetitorVideo, PreviousObservation, YoutubeThumbnail } from "./types";

const ILLEGAL_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function parseIso8601Duration(value: string): number {
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) throw new Error(`Duração ISO 8601 inválida: ${value}`);
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return Math.round(Number(days) * 86_400 + Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds));
}

export function sanitizeFileName(value: string): string {
  const clean = value
    .replace(ILLEGAL_FILE_CHARS, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return (clean || "video").slice(0, 140);
}

export function selectBestThumbnail(thumbnails: YoutubeThumbnail[]): YoutubeThumbnail | null {
  return thumbnails.reduce<YoutubeThumbnail | null>((best, item) => {
    if (!best) return item;
    return item.width * item.height > best.width * best.height ? item : best;
  }, null);
}

export function appendPreviousObservation(existing: CompetitorRecord | null, observedAt: string): PreviousObservation[] {
  if (!existing) return [];
  const previous = [...(existing.previousObservations ?? [])];
  if (!previous.some((item) => item.observedAt === existing.observedAt)) {
    previous.push({
      observedAt: existing.observedAt,
      views: existing.video.views,
      title: existing.video.title,
      publishedAt: existing.video.publishedAt,
    });
  }
  return previous
    .filter((item) => item.observedAt !== observedAt)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

export function hasVideoChanged(existing: CompetitorRecord | null, incoming: CompetitorVideo): boolean {
  if (!existing) return true;
  return existing.video.views !== incoming.views
    || existing.video.title !== incoming.title
    || existing.video.publishedAt !== incoming.publishedAt
    || existing.video.durationSeconds !== incoming.durationSeconds
    || existing.video.channelId !== incoming.channelId;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remaining = seconds % 60;
  return [hours ? `${hours}h` : "", `${minutes}min`, `${remaining}s`].filter(Boolean).join(" ");
}

export function formatSaoPauloDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

export function encodeMarkdownPath(value: string): string {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}
