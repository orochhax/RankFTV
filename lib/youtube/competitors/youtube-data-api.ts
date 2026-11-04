/* eslint-disable complexity, max-statements -- paginação e normalização seguem o contrato externo da API */
import type { ChannelIdentity, CollectionChannelResult, CompetitorVideo, YoutubeThumbnail } from "./types";
import { parseIso8601Duration } from "./core";

const API_BASE = "https://www.googleapis.com/youtube/v3";

type ApiListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

type ChannelItem = {
  id: string;
  snippet?: { title?: string; customUrl?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

type PlaylistItem = { contentDetails?: { videoId?: string; videoPublishedAt?: string } };

type VideoItem = {
  id: string;
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    categoryId?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
  };
  contentDetails?: { duration?: string; caption?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  status?: { privacyStatus?: string };
};

export class YoutubeDataApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly reason: string | null) {
    super(message);
    this.name = "YoutubeDataApiError";
  }
}

export class YoutubeDataApiProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey.trim()) throw new Error("YOUTUBE_ROCHA_TECH_API_KEY não configurada.");
  }

  private async list<T>(path: string, params: URLSearchParams): Promise<ApiListResponse<T>> {
    const response = await fetch(`${API_BASE}/${path}?${params.toString()}`, {
      headers: { accept: "application/json", "x-goog-api-key": this.apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json() as ApiListResponse<T>;
    if (!response.ok || body.error) {
      const reason = body.error?.errors?.[0]?.reason ?? null;
      throw new YoutubeDataApiError(
        body.error?.message ?? `YouTube Data API respondeu HTTP ${response.status}`,
        response.status,
        reason,
      );
    }
    return body;
  }

  async collectChannel(channel: ChannelIdentity, cutoff: Date): Promise<CollectionChannelResult> {
    const channelResponse = await this.list<ChannelItem>("channels", new URLSearchParams({
      part: "snippet,contentDetails",
      id: channel.id,
      maxResults: "1",
    }));
    const channelItem = channelResponse.items?.[0];
    const uploads = channelItem?.contentDetails?.relatedPlaylists?.uploads;
    if (!channelItem || !uploads) throw new Error(`Playlist de uploads não encontrada para ${channel.name}.`);

    const videoIds: string[] = [];
    let pageToken: string | undefined;
    let reachedCutoff = false;
    do {
      const params = new URLSearchParams({ part: "contentDetails", playlistId: uploads, maxResults: "50" });
      if (pageToken) params.set("pageToken", pageToken);
      const page = await this.list<PlaylistItem>("playlistItems", params);
      for (const item of page.items ?? []) {
        const videoId = item.contentDetails?.videoId;
        const publishedAt = item.contentDetails?.videoPublishedAt;
        if (publishedAt && new Date(publishedAt) < cutoff) {
          reachedCutoff = true;
          break;
        }
        if (videoId) videoIds.push(videoId);
      }
      pageToken = reachedCutoff ? undefined : page.nextPageToken;
    } while (pageToken);

    const items: VideoItem[] = [];
    for (let index = 0; index < videoIds.length; index += 50) {
      const response = await this.list<VideoItem>("videos", new URLSearchParams({
        part: "snippet,contentDetails,statistics,status",
        id: videoIds.slice(index, index + 50).join(","),
        maxResults: "50",
      }));
      items.push(...(response.items ?? []));
    }

    const categoryIds = [...new Set(items.map((item) => item.snippet?.categoryId).filter(Boolean))] as string[];
    const categories = await this.fetchCategories(categoryIds);
    const videos = items.flatMap((item) => {
      const video = normalizeVideoItem(item, channelItem, channel, categories);
      return video && new Date(video.publishedAt) >= cutoff ? [video] : [];
    });
    videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { channel, source: "youtube-data-api-v3", videos };
  }

  private async fetchCategories(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const response = await this.list<{ id: string; snippet?: { title?: string } }>(
      "videoCategories",
      new URLSearchParams({ part: "snippet", id: ids.join(",") }),
    );
    return new Map((response.items ?? []).flatMap((item) => (
      item.snippet?.title ? [[item.id, item.snippet.title] as const] : []
    )));
  }
}

function normalizeVideoItem(
  item: VideoItem,
  channelItem: ChannelItem,
  fallback: ChannelIdentity,
  categories: Map<string, string>,
): CompetitorVideo | null {
  const snippet = item.snippet;
  const publishedAt = snippet?.publishedAt;
  if (!snippet?.title || !publishedAt || !item.contentDetails?.duration) return null;
  const thumbnails = Object.values(snippet.thumbnails ?? {}).flatMap((thumbnail): YoutubeThumbnail[] => (
    thumbnail.url ? [{ url: thumbnail.url, width: thumbnail.width ?? 0, height: thumbnail.height ?? 0 }] : []
  ));
  const channelName = channelItem.snippet?.title ?? snippet.channelTitle ?? fallback.name;
  const categoryId = snippet.categoryId ?? "";
  return {
    id: item.id,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    title: snippet.title,
    channel: channelName,
    channelId: snippet.channelId ?? channelItem.id ?? fallback.id,
    durationSeconds: parseIso8601Duration(item.contentDetails.duration),
    publishedAt,
    publishDate: publishedAt,
    views: parsePublicCount(item.statistics?.viewCount),
    likes: parsePublicCount(item.statistics?.likeCount),
    comments: parsePublicCount(item.statistics?.commentCount),
    category: categories.get(categoryId) ?? (categoryId ? `YouTube category ${categoryId}` : null),
    isLive: snippet.liveBroadcastContent === "live" || snippet.liveBroadcastContent === "upcoming",
    captionsListed: item.contentDetails.caption === "true",
    thumbnails,
  };
}

function parsePublicCount(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
