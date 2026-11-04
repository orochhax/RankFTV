/* eslint-disable complexity -- adaptação defensiva do schema legado do cofre */
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChannelIdentity, CompetitorRecord, CompetitorVideo } from "./types";
import {
  appendPreviousObservation,
  encodeMarkdownPath,
  formatDuration,
  formatSaoPauloDate,
  sanitizeFileName,
  selectBestThumbnail,
} from "./core";

export async function discoverChannels(competitorsDir: string): Promise<ChannelIdentity[]> {
  const entries = await readdir(competitorsDir, { withFileTypes: true });
  const channels: ChannelIdentity[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderPath = path.join(competitorsDir, entry.name);
    let markdown: string;
    try {
      markdown = await readFile(path.join(folderPath, "Canal.md"), "utf8");
    } catch {
      continue;
    }
    const id = markdown.match(/^- ID:\s*`([^`]+)`/m)?.[1]?.trim();
    const url = markdown.match(/^- Canal:\s*(https?:\/\/\S+)/m)?.[1]?.trim();
    const name = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? entry.name;
    if (id && url) channels.push({ folderName: entry.name, folderPath, id, name, url });
  }
  return channels.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function readExistingRecords(channel: ChannelIdentity): Promise<Map<string, CompetitorRecord>> {
  const dataDir = path.join(channel.folderPath, "Dados");
  const records = new Map<string, CompetitorRecord>();
  let files: string[] = [];
  try {
    files = (await readdir(dataDir)).filter((file) => file.endsWith(".json"));
  } catch {
    return records;
  }
  for (const file of files) {
    try {
      const record = JSON.parse(await readFile(path.join(dataDir, file), "utf8")) as CompetitorRecord;
      if (record.video?.id) records.set(record.video.id, record);
    } catch {
      // Arquivos inválidos não são apagados nem sobrescrevem o restante da base.
    }
  }
  return records;
}

export async function writeVideoRecord(input: {
  channel: ChannelIdentity;
  video: CompetitorVideo;
  observedAt: string;
  existing: CompetitorRecord | null;
}): Promise<CompetitorRecord> {
  const { channel, video, observedAt, existing } = input;
  const dataDir = path.join(channel.folderPath, "Dados");
  const videosDir = path.join(channel.folderPath, "Videos");
  const thumbnailsDir = path.join(channel.folderPath, "Thumbnails");
  await Promise.all([
    mkdir(dataDir, { recursive: true }),
    mkdir(videosDir, { recursive: true }),
    mkdir(thumbnailsDir, { recursive: true }),
  ]);

  const bestThumbnail = selectBestThumbnail(video.thumbnails);
  const preservedThumbnail = existing?.thumbnail?.path ?? null;
  const thumbnailFile = preservedThumbnail
    ? path.basename(preservedThumbnail)
    : `${sanitizeFileName(video.title)} [${video.id}].jpg`;
  const thumbnailRelativePath = `Thumbnails/${thumbnailFile}`;
  const thumbnailAbsolutePath = path.join(channel.folderPath, thumbnailRelativePath);
  let thumbnailExists = await fileExists(thumbnailAbsolutePath);
  if (!thumbnailExists && bestThumbnail) {
    thumbnailExists = await downloadThumbnail(bestThumbnail.url, thumbnailAbsolutePath);
  }

  const record: CompetitorRecord = {
    schemaVersion: 1,
    source: "youtube-data-api-v3",
    observedAt,
    channel: { name: video.channel, id: video.channelId, url: channel.url },
    video,
    thumbnail: {
      sourceUrl: bestThumbnail?.url ?? existing?.thumbnail?.sourceUrl ?? null,
      path: thumbnailRelativePath,
      exists: thumbnailExists,
    },
    previousObservations: appendPreviousObservation(existing, observedAt),
    limitations: [
      "Public data only; private analytics such as impressions, CTR and retention are unavailable.",
      "A dated observation is not a live counter.",
    ],
  };
  await writeFile(path.join(dataDir, `${video.id}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const markdownName = existing
    ? await findVideoMarkdownById(videosDir, video.id) ?? `${sanitizeFileName(video.title)} (${video.id}).md`
    : `${sanitizeFileName(video.title)} (${video.id}).md`;
  await writeFile(path.join(videosDir, markdownName), renderVideoMarkdown(record), "utf8");
  return record;
}

export async function writeChannelIndex(channel: ChannelIdentity, observedAt: string, cutoff: Date): Promise<void> {
  const records = [...(await readExistingRecords(channel)).values()]
    .filter((record) => new Date(record.video.publishedAt) >= cutoff)
    .sort((a, b) => b.video.publishedAt.localeCompare(a.video.publishedAt));
  const lines = await Promise.all(records.map(async (record) => {
    const fileName = await findVideoMarkdownById(path.join(channel.folderPath, "Videos"), record.video.id)
      ?? `${sanitizeFileName(record.video.title)} (${record.video.id}).md`;
    return `- [${record.video.title}](${encodeMarkdownPath(`Videos/${fileName}`)}) — ${formatSaoPauloDate(record.video.publishedAt)}`;
  }));
  const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
  const content = `# ${channel.name}\n\n- Canal: ${channel.url}\n- ID: \`${channel.id}\`\n- Coleta: ${formatSaoPauloDate(observedAt)}, America/Sao_Paulo\n- Janela: ${formatter.format(cutoff)} a ${formatter.format(new Date(observedAt))}\n- Vídeos coletados: ${records.length}\n\n## Vídeos\n\n${lines.join("\n")}\n`;
  await writeFile(path.join(channel.folderPath, "Canal.md"), content, "utf8");
}

function renderVideoMarkdown(record: CompetitorRecord): string {
  const video = record.video;
  const format = video.isLive ? "live" : video.durationSeconds <= 60 ? "short" : "vídeo longo";
  const thumbnail = record.thumbnail.path ? encodeMarkdownPath(`../${record.thumbnail.path}`) : null;
  return `---\ntipo: video-concorrente\ncanal: ${video.channel}\nvideo_id: ${video.id}\ndata_coleta: ${record.observedAt.slice(0, 10)}\n---\n\n# ${video.title}\n\n[Abrir vídeo no YouTube](${video.url})\n\n| Campo | Valor |\n| --- | --- |\n| Publicação — São Paulo | ${formatSaoPauloDate(video.publishedAt)} |\n| Duração | ${formatDuration(video.durationSeconds)} |\n| Visualizações | ${video.views ?? "indisponível"} |\n| Curtidas públicas | ${video.likes ?? "indisponível"} |\n| Comentários públicos | ${video.comments ?? "indisponível"} |\n| Formato | ${format} |\n\n${thumbnail ? `![Thumbnail](${thumbnail})\n\n` : ""}## Limites\n\nMétricas privadas, retenção, CTR, impressões e histórico de crescimento não estão disponíveis nesta coleta pública. A thumbnail é uma referência de terceiros, preservada para pesquisa editorial.\n`;
}

async function findVideoMarkdownById(videosDir: string, videoId: string): Promise<string | null> {
  try {
    return (await readdir(videosDir)).find((file) => file.endsWith(`(${videoId}).md`)) ?? null;
  } catch {
    return null;
  }
}

async function downloadThumbnail(url: string, destination: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return false;
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
