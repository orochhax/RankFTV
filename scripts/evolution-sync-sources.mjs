import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), "data", "evolution");
const roadmapSource = resolve(outputDir, "roadmap.json");
const rankSource = resolve(process.cwd(), "PENDENCIAS-V1.md");

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function cleanMarkdown(value) {
  return value.replace(/\[([^\]]+)]\([^)]+\)/g, "$1").replace(/[`*_>#]/g, "").replace(/\s+/g, " ").trim();
}

// O parser mantém toda a lógica em um único fluxo para preservar parágrafos Markdown quebrados em várias linhas.
// eslint-disable-next-line complexity, max-statements
function parseRank(markdown) {
  const updatedAt = markdown.match(/Atualizado em\s+(\d{2})\/(\d{2})\/(\d{4})/)?.slice(1, 4);
  const progressMatch = markdown.match(/\*\*(\d+)% concluído\*\*\s+—\s+(\d+) de (\d+)[\s\S]{0,100}?restam (\d+)/);
  const items = [];
  let priority = null;
  let pending = null;

  const flush = () => {
    if (!pending || !priority) return;
    const summary = cleanMarkdown(pending);
    const firstSentence = summary.split(/(?<=[.!?])\s+/)[0];
    items.push({ id: `${priority.toLowerCase()}-${slug(firstSentence)}`, title: firstSentence.replace(/[.:]$/, ""), priority, summary: firstSentence });
    pending = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(P[012])\b/);
    if (heading) { flush(); priority = heading[1]; continue; }
    if (/^##\s+/.test(line) && !heading) { flush(); priority = null; continue; }
    const task = line.match(/^- \[ \]\s+(.+)/);
    if (task && priority) { flush(); pending = task[1]; continue; }
    if (pending && /^\s{2,}\S/.test(line)) pending += ` ${line.trim()}`;
    else if (pending && line.trim() === "") flush();
  }
  flush();

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: "PENDENCIAS-V1.md",
    updatedAt: updatedAt ? `${updatedAt[2]}-${updatedAt[1]}-${updatedAt[0]}` : null,
    progress: progressMatch
      ? { percent: Number(progressMatch[1]), completed: Number(progressMatch[2]), total: Number(progressMatch[3]), remaining: Number(progressMatch[4]) }
      : { percent: 0, completed: 0, total: 0, remaining: items.filter((item) => item.priority === "P0").length },
    items,
  };
}

const [roadmapRaw, rankMarkdown] = await Promise.all([readFile(roadmapSource, "utf8"), readFile(rankSource, "utf8")]);
const roadmap = JSON.parse(roadmapRaw);
const rank = parseRank(rankMarkdown);

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(roadmapSource, `${JSON.stringify(roadmap, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "rankftv.json"), `${JSON.stringify(rank, null, 2)}\n`, "utf8"),
]);

process.stdout.write(`Roadmap oficial: ${roadmap.days.length} dias preservados.\n`);
process.stdout.write(`RankFTV: ${rank.items.length} pendências sincronizadas (${rank.progress.percent}%).\n`);
