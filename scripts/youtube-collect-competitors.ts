/* eslint-disable complexity, max-statements, quality/no-direct-console -- CLI local precisa emitir resumo sanitizado */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { hasVideoChanged } from "../lib/youtube/competitors/core";
import {
  discoverChannels,
  readExistingRecords,
  writeChannelIndex,
  writeVideoRecord,
} from "../lib/youtube/competitors/storage";
import type {
  ChannelIdentity,
  CollectionChannelResult,
  CollectionReport,
  CompetitorCollectionMode,
  CompetitorRecord,
} from "../lib/youtube/competitors/types";
import { YoutubeDataApiProvider } from "../lib/youtube/competitors/youtube-data-api";

loadEnvConfig(process.cwd());

type CliOptions = {
  competitorsDir: string;
  mode: CompetitorCollectionMode;
  apply: boolean;
  validateOnly: boolean;
  days: number;
  channelId: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  const valueOf = (name: string) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const mode = (valueOf("--mode") ?? "api-preferred") as CompetitorCollectionMode;
  if (!(["api-preferred", "api-only", "fallback-only"] as string[]).includes(mode)) {
    throw new Error(`Modo inválido: ${mode}`);
  }
  const days = Number(valueOf("--days") ?? "365");
  if (!Number.isInteger(days) || days < 1 || days > 3_650) {
    throw new Error("--days deve ser um inteiro entre 1 e 3650.");
  }
  const competitorsDir = valueOf("--competitors-dir") ?? process.env.ROCHA_TECH_COMPETITORS_DIR ?? "";
  if (!competitorsDir) {
    throw new Error("Informe --competitors-dir ou ROCHA_TECH_COMPETITORS_DIR no .env.local deste worktree.");
  }
  const apply = argv.includes("--apply");
  const validateOnly = argv.includes("--validate-only");
  if (apply && validateOnly) throw new Error("Use somente um entre --apply e --validate-only.");
  return {
    competitorsDir: path.resolve(competitorsDir),
    mode,
    apply,
    validateOnly,
    days,
    channelId: valueOf("--channel") ?? null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const observedAt = new Date().toISOString();
  const cutoff = new Date(Date.now() - options.days * 86_400_000);
  let channels = await discoverChannels(options.competitorsDir);
  if (options.channelId) channels = channels.filter((channel) => channel.id === options.channelId);
  if (channels.length === 0) throw new Error("Nenhum canal válido foi encontrado.");

  const apiKey = process.env.YOUTUBE_ROCHA_TECH_API_KEY?.trim() ?? "";
  if (options.mode === "api-only" && !apiKey) {
    throw new Error("YOUTUBE_ROCHA_TECH_API_KEY não configurada para o modo api-only.");
  }
  const provider = options.mode === "fallback-only" || !apiKey
    ? null
    : new YoutubeDataApiProvider(apiKey);
  const fallbackReason = options.mode === "fallback-only"
    ? "Modo fallback-only: usar o procedimento público/manual atual."
    : "Chave exclusiva do Rocha Tech ainda não configurada; usar o procedimento público/manual atual.";
  const report: CollectionReport = {
    generatedAt: observedAt,
    mode: options.mode,
    applyRequested: options.apply,
    applied: false,
    cutoff: cutoff.toISOString(),
    channels: [],
    manualFallback: [],
    totals: {
      channels: channels.length,
      videos: 0,
      newVideos: 0,
      updatedVideos: 0,
      unchangedVideos: 0,
      failures: 0,
    },
  };
  const pendingWrites: Array<{
    channel: ChannelIdentity;
    result: CollectionChannelResult;
    existing: Map<string, CompetitorRecord>;
  }> = [];

  for (const channel of channels) {
    const existing = await readExistingRecords(channel);
    if (!provider) {
      report.channels.push({
        id: channel.id,
        name: channel.name,
        source: "local-fallback",
        videos: existing.size,
        newVideos: 0,
        updatedVideos: 0,
        unchangedVideos: existing.size,
      });
      report.manualFallback.push({
        channelId: channel.id,
        channelName: channel.name,
        reason: fallbackReason,
      });
      report.totals.videos += existing.size;
      report.totals.unchangedVideos += existing.size;
      continue;
    }

    try {
      const result = await provider.collectChannel(channel, cutoff);
      let newVideos = 0;
      let updatedVideos = 0;
      let unchangedVideos = 0;
      for (const video of result.videos) {
        const current = existing.get(video.id) ?? null;
        if (!current) newVideos += 1;
        else if (hasVideoChanged(current, video)) updatedVideos += 1;
        else unchangedVideos += 1;
      }
      pendingWrites.push({ channel, result, existing });
      report.channels.push({
        id: channel.id,
        name: channel.name,
        source: result.source,
        videos: result.videos.length,
        newVideos,
        updatedVideos,
        unchangedVideos,
      });
      report.totals.videos += result.videos.length;
      report.totals.newVideos += newVideos;
      report.totals.updatedVideos += updatedVideos;
      report.totals.unchangedVideos += unchangedVideos;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha desconhecida";
      report.totals.failures += 1;
      report.channels.push({
        id: channel.id,
        name: channel.name,
        source: "local-fallback",
        videos: existing.size,
        newVideos: 0,
        updatedVideos: 0,
        unchangedVideos: existing.size,
        error: reason,
      });
      report.manualFallback.push({ channelId: channel.id, channelName: channel.name, reason });
      if (options.mode === "api-only") throw error;
    }
  }

  const canApply = options.apply
    && report.totals.failures === 0
    && report.manualFallback.length === 0;
  if (canApply) {
    for (const pending of pendingWrites) {
      for (const video of pending.result.videos) {
        await writeVideoRecord({
          channel: pending.channel,
          video,
          observedAt,
          existing: pending.existing.get(video.id) ?? null,
        });
      }
      await writeChannelIndex(pending.channel, observedAt, cutoff);
    }
    report.applied = true;
  }

  const artifactDir = path.join(
    process.cwd(),
    ".codex-artifacts",
    "youtube-competitors",
    observedAt.replace(/[:.]/g, "-"),
  );
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    path.join(artifactDir, "collection-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({
    status: report.totals.failures === 0 ? "ok" : "partial",
    mode: report.mode,
    applyRequested: report.applyRequested,
    applied: report.applied,
    ...report.totals,
    manualFallback: report.manualFallback.length,
    report: path.join(artifactDir, "collection-report.json"),
  }, null, 2));
  if (report.totals.failures > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida.");
  process.exitCode = 1;
});
