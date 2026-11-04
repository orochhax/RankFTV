import fs from "node:fs/promises";
import path from "node:path";
import snapshotJson from "./carlos-rocha-rank-snapshot.json";

export type CarlosRochaOutlier = {
  id: string;
  channel: string;
  title: string;
  url: string;
  views: number;
  publishedAt: string;
  durationSeconds: number | null;
  channelMedianViews: number;
  relativePerformanceMultiple: number;
};

type CarlosRochaRank = { observedAt: string | null; channels: number; videos: number; topVideos: CarlosRochaOutlier[] };
type CollectedVideo = Omit<CarlosRochaOutlier, "channelMedianViews" | "relativePerformanceMultiple">;

const empty: CarlosRochaRank = { observedAt: null, channels: 0, videos: 0, topVideos: [] };
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const rank = (videos: CollectedVideo[]): CarlosRochaOutlier[] => {
  const medians = new Map<string, number>();
  for (const channel of new Set(videos.map((video) => video.channel))) {
    const values = videos.filter((video) => video.channel === channel).map((video) => video.views);
    if (values.length >= 5) medians.set(channel, median(values));
  }
  const sorted = videos
    .flatMap((video) => {
      const channelMedianViews = medians.get(video.channel);
      if (!channelMedianViews) return [];
      return [{ ...video, channelMedianViews, relativePerformanceMultiple: video.views / Math.max(1, channelMedianViews) }];
    })
    .sort((a, b) => b.relativePerformanceMultiple - a.relativePerformanceMultiple || b.views - a.views);
  const counts = new Map<string, number>();
  return sorted.filter((video) => {
    const count = counts.get(video.channel) ?? 0;
    if (count >= 3) return false;
    counts.set(video.channel, count + 1);
    return true;
  }).slice(0, 15);
};

async function readLocalRank(): Promise<CarlosRochaRank> {
  const vaultRoot = process.env.CARLOS_ROCHA_VAULT_ROOT ?? "C:\\Users\\SnyX\\Desktop\\Carlos Rocha";
  const root = path.join(vaultRoot, "Carlos Rocha - YT", "Concorrentes");
  try {
    const folders = await fs.readdir(root, { withFileTypes: true });
    const videos: CollectedVideo[] = [];
    const channels = new Set<string>();
    let observedAt: string | null = null;
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      const dataRoot = path.join(root, folder.name, "Dados");
      let files: import("node:fs").Dirent[];
      try { files = await fs.readdir(dataRoot, { withFileTypes: true }); } catch { continue; }
      for (const file of files) {
        if (!file.name.endsWith(".json")) continue;
        const item = JSON.parse(await fs.readFile(path.join(dataRoot, file.name), "utf8"));
        const video = item.video;
        if (!video?.id || !Number.isFinite(Number(video.views))) continue;
        const channel = item.channel?.name ?? folder.name;
        channels.add(channel);
        observedAt = !observedAt || item.observedAt > observedAt ? item.observedAt : observedAt;
        videos.push({ id: video.id, channel, title: video.title, url: video.url, views: Number(video.views), publishedAt: video.publishDate ?? video.publishedAt?.slice(0, 10) ?? "", durationSeconds: video.durationSeconds ?? null });
      }
    }
    return { observedAt, channels: channels.size, videos: videos.length, topVideos: rank(videos) };
  } catch { return empty; }
}

export async function getCarlosRochaOutlierRank(): Promise<CarlosRochaRank> {
  const local = await readLocalRank();
  return local.topVideos.length ? local : snapshotJson as CarlosRochaRank;
}

export async function buildCarlosRochaOutlierSnapshot() { return readLocalRank(); }
