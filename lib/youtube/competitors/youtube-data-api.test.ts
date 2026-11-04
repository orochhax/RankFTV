import assert from "node:assert/strict";
import test from "node:test";
import { YoutubeDataApiProvider } from "./youtube-data-api";
import type { ChannelIdentity } from "./types";

const channel: ChannelIdentity = {
  folderName: "Canal Teste",
  folderPath: "C:/tmp/canal-teste",
  id: "UC_TEST",
  name: "Canal Teste",
  url: "https://www.youtube.com/@teste/videos",
};

test("coleta uploads, metadados públicos e não expõe a chave na URL", async (context) => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  const headers: Array<HeadersInit | undefined> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    urls.push(url);
    headers.push(init?.headers);
    if (url.includes("/channels?")) return json({
      items: [{
        id: "UC_TEST",
        snippet: { title: "Canal Teste" },
        contentDetails: { relatedPlaylists: { uploads: "UU_TEST" } },
      }],
    });
    if (url.includes("/playlistItems?")) return json({
      items: [{ contentDetails: { videoId: "video_1", videoPublishedAt: "2026-11-01T12:00:00Z" } }],
    });
    if (url.includes("/videos?")) return json({
      items: [{
        id: "video_1",
        snippet: {
          title: "Vídeo teste",
          channelId: "UC_TEST",
          channelTitle: "Canal Teste",
          publishedAt: "2026-11-01T12:00:00Z",
          categoryId: "28",
          liveBroadcastContent: "none",
          thumbnails: { high: { url: "https://i.ytimg.com/test.jpg", width: 480, height: 360 } },
        },
        contentDetails: { duration: "PT12M5S", caption: "true" },
        statistics: { viewCount: "1234", likeCount: "50", commentCount: "4" },
        status: { privacyStatus: "public" },
      }],
    });
    return json({ items: [{ id: "28", snippet: { title: "Science & Technology" } }] });
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const result = await new YoutubeDataApiProvider("secret-test-key").collectChannel(
    channel,
    new Date("2026-01-01T00:00:00Z"),
  );
  assert.equal(result.videos.length, 1);
  assert.equal(result.videos[0]?.views, 1_234);
  assert.equal(result.videos[0]?.durationSeconds, 725);
  assert.equal(result.videos[0]?.category, "Science & Technology");
  assert.ok(urls.every((url) => !url.includes("secret-test-key")));
  assert.ok(headers.every((value) => new Headers(value).get("x-goog-api-key") === "secret-test-key"));
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
