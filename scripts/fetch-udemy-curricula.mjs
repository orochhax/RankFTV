import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const roadmapPath = path.join(root, "data/evolution/roadmap.json");
const outputPath = path.join(root, "data/evolution/udemy-curricula.json");
const roadmap = JSON.parse(await fs.readFile(roadmapPath, "utf8"));

const courseUrls = [...new Set(roadmap.days.flatMap((day) => day.courses.map((course) => course.url)))]
  .sort((left, right) => left.localeCompare(right));

function courseSlug(url) {
  return new URL(url).pathname.match(/^\/course\/([^/]+)/)?.[1] ?? null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Udemy respondeu HTTP ${response.status} para ${url}`);
  return response.json();
}

async function fetchCourse(url) {
  const slug = courseSlug(url);
  if (!slug) throw new Error(`Link de curso inválido: ${url}`);
  const course = await fetchJson(`https://www.udemy.com/api-2.0/courses/${slug}/?fields%5Bcourse%5D=id,title,url,last_update_date`);
  const fields = [
    "fields%5Bchapter%5D=id,title,object_index",
    "fields%5Blecture%5D=id,title,object_index,asset",
    "fields%5Basset%5D=id,time_estimation,asset_type",
    "fields%5Bquiz%5D=id,title,object_index,type,duration",
    "fields%5Bpractice%5D=id,title,object_index",
    "fields%5Brole-play%5D=id,title,object_index",
  ].join("&");
  const curriculum = await fetchJson(`https://www.udemy.com/api-2.0/courses/${course.id}/public-curriculum-items/?page_size=1000&${fields}`);
  if (curriculum.next) throw new Error(`A grade de ${course.title} excedeu 1.000 itens.`);

  const sections = [];
  let currentSection = null;
  for (const item of curriculum.results) {
    if (item._class === "chapter") {
      currentSection = {
        id: item.id,
        number: item.object_index,
        title: item.title,
        items: [],
      };
      sections.push(currentSection);
      continue;
    }
    if (!currentSection) throw new Error(`Item sem seção em ${course.title}: ${item.title ?? item.id}`);
    currentSection.items.push({
      id: item.id,
      type: item._class,
      subtype: item.type ?? null,
      number: item.object_index ?? null,
      title: item.title,
      durationSeconds: item.asset?.time_estimation ?? (item.duration > 0 ? item.duration : null),
    });
  }

  return {
    id: course.id,
    slug,
    title: course.title,
    url: new URL(course.url, "https://www.udemy.com").href,
    lastUpdateDate: course.last_update_date ?? null,
    sectionCount: sections.length,
    itemCount: sections.reduce((total, section) => total + section.items.length, 0),
    lectureCount: sections.reduce((total, section) => total + section.items.filter((item) => item.type === "lecture").length, 0),
    totalLectureSeconds: sections.reduce((total, section) => total + section.items.filter((item) => item.type === "lecture").reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0), 0),
    sections,
  };
}

const courses = [];
for (const url of courseUrls) {
  const course = await fetchCourse(url);
  courses.push(course);
  process.stderr.write(`Udemy: ${course.title} — ${course.sectionCount} seções, ${course.lectureCount} aulas.\n`);
}

const snapshot = {
  fetchedAt: new Date().toISOString(),
  source: "Udemy API v2 public-curriculum-items",
  courseCount: courses.length,
  courses,
};
await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ outputPath, courseCount: courses.length, sectionCount: courses.reduce((sum, course) => sum + course.sectionCount, 0), lectureCount: courses.reduce((sum, course) => sum + course.lectureCount, 0) }, null, 2)}\n`);
