import fs from "node:fs/promises";
import path from "node:path";
import { buildEditorialIntelligenceSnapshot } from "../lib/evolution/intelligence";

async function main() {
  const snapshot = await buildEditorialIntelligenceSnapshot();
  const packaged = {
    observedAt: snapshot.observedAt,
    channels: [],
    videos: [],
    topVideos: snapshot.topVideos,
    topics: snapshot.topics,
    stats: snapshot.stats,
  };

  const output = path.join(process.cwd(), "lib", "evolution", "intelligence-snapshot.json");
  await fs.writeFile(output, `${JSON.stringify(packaged, null, 2)}\n`, "utf8");
  console.log(`Snapshot editorial gerado: ${snapshot.stats.videos} vídeos, ${snapshot.stats.channels} canais, ${snapshot.topVideos.length} oportunidades.`);
}

void main();
