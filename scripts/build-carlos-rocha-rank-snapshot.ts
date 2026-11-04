import fs from "node:fs/promises";
import path from "node:path";
import { buildCarlosRochaOutlierSnapshot } from "../lib/evolution/carlos-rocha-rank";

async function main() {
  const snapshot = await buildCarlosRochaOutlierSnapshot();
  await fs.writeFile(path.join(process.cwd(), "lib", "evolution", "carlos-rocha-rank-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Snapshot Carlos Rocha: ${snapshot.videos} vídeos, ${snapshot.channels} canais e ${snapshot.topVideos.length} fora da curva.`);
}

void main();
