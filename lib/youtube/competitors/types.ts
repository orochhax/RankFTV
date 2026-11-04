export type CompetitorCollectionMode = "api-preferred" | "api-only" | "fallback-only";

export type YoutubeThumbnail = {
  url: string;
  width: number;
  height: number;
};

export type CompetitorVideo = {
  id: string;
  url: string;
  title: string;
  channel: string;
  channelId: string;
  durationSeconds: number;
  publishedAt: string;
  publishDate: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  category: string | null;
  isLive: boolean;
  captionsListed: boolean;
  thumbnails: YoutubeThumbnail[];
};

export type PreviousObservation = {
  observedAt: string;
  views: number | null;
  title: string;
  publishedAt: string;
};

export type CompetitorRecord = {
  schemaVersion: 1;
  source: "youtube-data-api-v3" | "youtube-public-page";
  observedAt: string;
  channel: { name: string; id: string; url: string };
  video: CompetitorVideo;
  thumbnail: { sourceUrl: string | null; path: string | null; exists: boolean };
  previousObservations: PreviousObservation[];
  limitations: string[];
};

export type ChannelIdentity = {
  folderName: string;
  folderPath: string;
  id: string;
  name: string;
  url: string;
};

export type CollectionChannelResult = {
  channel: ChannelIdentity;
  source: "youtube-data-api-v3" | "local-fallback";
  videos: CompetitorVideo[];
  error?: string;
};

export type CollectionReport = {
  generatedAt: string;
  mode: CompetitorCollectionMode;
  applyRequested: boolean;
  applied: boolean;
  cutoff: string;
  channels: Array<{
    id: string;
    name: string;
    source: "youtube-data-api-v3" | "local-fallback";
    videos: number;
    newVideos: number;
    updatedVideos: number;
    unchangedVideos: number;
    error?: string;
  }>;
  manualFallback: Array<{ channelId: string; channelName: string; reason: string }>;
  totals: {
    channels: number;
    videos: number;
    newVideos: number;
    updatedVideos: number;
    unchangedVideos: number;
    failures: number;
  };
};
