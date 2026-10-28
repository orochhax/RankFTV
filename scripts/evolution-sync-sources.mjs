import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const vaultArgIndex = args.indexOf("--vault");
const vaultPath = vaultArgIndex >= 0 ? args[vaultArgIndex + 1] : process.env.CARLOS_VAULT_PATH;

if (!vaultPath) {
  throw new Error("Informe o cofre com --vault <caminho> ou CARLOS_VAULT_PATH.");
}

const outputDir = resolve(process.cwd(), "data", "evolution");
const roadmapRelative = "DataScience/01 - Roadmap/roadmap-servicos-diario.md";
const rankSource = resolve(process.cwd(), "PENDENCIAS-V1.md");

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function cleanMarkdown(value) {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRoadmap(markdown) {
  const period = markdown.match(/\*\*Período planejado:\*\*\s*(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/);
  const totalDays = Number(markdown.match(/\*\*Dias de estudo:\*\*\s*(\d+)/)?.[1] ?? 0);
  const blocks = [...markdown.matchAll(/<details(?: open)?>[\s\S]*?<summary><strong>Dia\s+(\d+)\s+—\s+(\d{2})\/(\d{2})\/(\d{4})\s+\(([^)]+)\)\s+—\s+(\d+)h(?:\s+(?:total|totais)|(\d+)min)[^<]*<\/strong><\/summary>([\s\S]*?)<\/details>/g)];

  const days = blocks.map((match) => {
    const [, dayNumber, day, month, year, weekday, hours, minutes = "0", body] = match;
    const sections = [];
    const courses = [];
    let currentCourse = null;
    let currentTrack = null;
    let current = { title: "Geral", tasks: [] };
    sections.push(current);

    for (const line of body.split(/\r?\n/)) {
      const sectionMatch = line.match(/^###\s+(.+)/);
      if (sectionMatch) {
        current = { title: cleanMarkdown(sectionMatch[1]), tasks: [] };
        sections.push(current);
        const sectionTitle = cleanMarkdown(sectionMatch[1]).toLowerCase();
        currentTrack = sectionTitle.includes("data science") ? "datascience" : sectionTitle.includes("inglês") || sectionTitle.includes("ingles") ? "english" : null;
        currentCourse = null;
        continue;
      }
      const courseMatch = line.match(/^\*\*Curso:\*\*\s+\[([^\]]+)\]\(([^)]+)\)/);
      if (courseMatch && currentTrack) {
        currentCourse = { id: `${currentTrack}-${slug(courseMatch[1])}`, title: cleanMarkdown(courseMatch[1]), url: courseMatch[2], lessons: [] };
        courses.push(currentCourse);
        continue;
      }
      const taskMatch = line.match(/^- \[[ xX]\]\s+(.+)/);
      if (!taskMatch) continue;
      const label = cleanMarkdown(taskMatch[1]);
      const duration = label.match(/—\s*(?:(\d+)h)?\s*(\d+)min(?:\d+s)?/i);
      const lower = label.toLowerCase();
      const kind = lower.startsWith("aula:") ? "aula"
        : lower.startsWith("quiz:") ? "quiz"
          : lower.startsWith("simulação:") ? "simulacao"
            : current.title.toLowerCase().includes("prática") ? "entrega"
              : "outro";
      current.tasks.push({
        id: `dia-${String(dayNumber).padStart(2, "0")}-${slug(label)}`,
        label,
        kind,
        durationMinutes: duration ? Number(duration[1] ?? 0) * 60 + Number(duration[2]) : null,
      });
      if (currentCourse) currentCourse.lessons.push(current.tasks.at(-1));
    }

    return {
      id: `dia-${String(dayNumber).padStart(2, "0")}`,
      dayNumber: Number(dayNumber),
      date: `${year}-${month}-${day}`,
      weekday,
      plannedMinutes: Number(hours) * 60 + Number(minutes),
      sections: sections.filter((section) => section.tasks.length > 0),
      courses,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: roadmapRelative,
    period: period
      ? { start: `${period[3]}-${period[2]}-${period[1]}`, end: `${period[6]}-${period[5]}-${period[4]}` }
      : { start: days[0]?.date ?? "", end: days.at(-1)?.date ?? "" },
    totalBusinessDays: totalDays || days.length,
    days,
  };
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
    items.push({
      id: `${priority.toLowerCase()}-${slug(firstSentence)}`,
      title: firstSentence.replace(/[.:]$/, ""),
      priority,
      summary: firstSentence,
    });
    pending = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(P[012])\b/);
    if (heading) {
      flush();
      priority = heading[1];
      continue;
    }
    if (/^##\s+/.test(line) && !heading) {
      flush();
      priority = null;
      continue;
    }
    const task = line.match(/^- \[ \]\s+(.+)/);
    if (task && priority) {
      flush();
      pending = task[1];
      continue;
    }
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

const roadmapMarkdown = await readFile(resolve(vaultPath, roadmapRelative), "utf8");
const rankMarkdown = await readFile(rankSource, "utf8");
const roadmap = parseRoadmap(roadmapMarkdown);
const rank = parseRank(rankMarkdown);

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "roadmap.json"), `${JSON.stringify(roadmap, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "rankftv.json"), `${JSON.stringify(rank, null, 2)}\n`, "utf8"),
]);

process.stdout.write(`Roadmap: ${roadmap.days.length} dias sincronizados.\n`);
process.stdout.write(`RankFTV: ${rank.items.length} pendências sincronizadas (${rank.progress.percent}%).\n`);
