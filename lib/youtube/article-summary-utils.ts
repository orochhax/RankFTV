const MAX_SOURCE_CHARS = 80_000;

export function isSafeArticleUrl(value: string) {
  try {
    const url = new URL(value);
    if (!( ["http:", "https:"].includes(url.protocol))) return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host === "::1") return false;
    if (/^(127|10)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const private172 = host.match(/^172\.(\d{1,3})\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

export function extractArticleText(input: string, contentType = "text/html") {
  if (!contentType.toLowerCase().includes("html")) return input.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_CHARS);
  const withoutNoise = input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|nav|footer|header|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|article|section|h[1-6]|li|blockquote|br|div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutNoise)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 30)
    .join("\n")
    .slice(0, MAX_SOURCE_CHARS)
    .trim();
}
