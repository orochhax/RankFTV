import { isIP } from "node:net";
import { z } from "zod";

export const youtubeSourceKinds = [
  "site",
  "blog",
  "youtube",
  "x",
  "newsletter",
  "reddit",
  "rss",
  "atom",
  "api",
  "other",
] as const;

export type YoutubeSourceKind = (typeof youtubeSourceKinds)[number];

const blockedHosts = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
}

export function normalizeYoutubeSourceUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  return url.toString().replace(/\/$/, "");
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    if (blockedHosts.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (isPrivateIpv4(hostname)) return false;
    if (isIP(hostname) === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:"))) return false;
    return true;
  } catch {
    return false;
  }
}

const sourceUrlSchema = z.string().trim().min(8).max(2048)
  .refine(isPublicHttpUrl, "Informe um link público começando com http:// ou https://.")
  .transform(normalizeYoutubeSourceUrl);

export const youtubeSourceCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da fonte.").max(120),
  url: sourceUrlSchema,
  kind: z.enum(youtubeSourceKinds),
}).strict();

export const youtubeSourceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  url: sourceUrlSchema.optional(),
  kind: z.enum(youtubeSourceKinds).optional(),
  enabled: z.boolean().optional(),
}).strict().refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "Informe ao menos uma alteração.",
});

