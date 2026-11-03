import fs from "node:fs/promises";

const [curricula, roadmap] = await Promise.all([
  fs.readFile("data/evolution/udemy-curricula.json", "utf8").then(JSON.parse),
  fs.readFile("data/evolution/roadmap.json", "utf8").then(JSON.parse),
]);

const expected = new Map();
for (const course of curricula.courses) {
  for (const section of course.sections) {
    for (const item of section.items) {
      const id = `udemy-${course.id}-${item.type}-${item.id}`;
      expected.set(id, { course, section, item });
    }
  }
}

const actual = new Map();
const duplicates = [];
for (const day of roadmap.days) {
  for (const section of day.sections) {
    for (const task of section.tasks) {
      if (!task.id.startsWith("udemy-")) continue;
      if (actual.has(task.id)) duplicates.push(task.id);
      actual.set(task.id, { day, section, task });
    }
  }
}

const missing = [...expected.keys()].filter((id) => !actual.has(id));
const extra = [...actual.keys()].filter((id) => !expected.has(id));
const mismatches = [];
for (const [id, value] of expected) {
  const recorded = actual.get(id);
  if (!recorded) continue;
  const expectedDuration = value.item.durationSeconds ?? null;
  if (
    recorded.task.udemyCourseId !== value.course.id
    || recorded.task.udemyItemId !== value.item.id
    || recorded.task.sectionNumber !== value.section.number
    || recorded.task.itemNumber !== value.item.number
    || (recorded.task.durationSeconds ?? null) !== expectedDuration
    || !recorded.task.label.includes(value.item.title)
    || !recorded.section.title.includes(`Seção ${value.section.number}: ${value.section.title}`)
  ) mismatches.push(id);
}

if (duplicates.length || missing.length || extra.length || mismatches.length) {
  process.stderr.write(`${JSON.stringify({ duplicates, missing, extra, mismatches }, null, 2)}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ courses: curricula.courseCount, sections: curricula.courses.reduce((sum, course) => sum + course.sectionCount, 0), items: expected.size, lectures: curricula.courses.reduce((sum, course) => sum + course.lectureCount, 0), roadmapDays: roadmap.totalBusinessDays, plannedHours: Math.round((roadmap.totalPlannedMinutes / 60) * 10) / 10 }, null, 2)}\n`);
