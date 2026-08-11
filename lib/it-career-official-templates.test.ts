import assert from "node:assert/strict";
import test from "node:test";

import { itCareerIds, itCareerLevelIds } from "./it-career-roadmaps";
import { officialItCareerTemplate, officialItCareerTemplates, validateOfficialItCareerTemplates } from "./it-career-official-templates";

test("a matriz oficial cobre cada carreira e nível exibidos", () => {
  assert.equal(officialItCareerTemplates.length, itCareerIds.length * itCareerLevelIds.length);
  assert.doesNotThrow(validateOfficialItCareerTemplates);
  for (const career of itCareerIds) for (const level of itCareerLevelIds) {
    const template = officialItCareerTemplate(career, level);
    assert.ok(template, `${career}:${level} deve existir`);
    assert.ok(template!.phases.length >= 1);
    assert.ok(template!.phases.at(-1)!.modules.every((module) => module.topics.length >= 2));
  }
});

test("níveis oficiais são cumulativos e não confundem cargo livre com currículo", () => {
  const junior = officialItCareerTemplate("data_science_ai", "junior");
  const senior = officialItCareerTemplate("data_science_ai", "senior");
  assert.ok(junior && senior);
  assert.ok(senior.phases.length > junior.phases.length);
  assert.equal(senior.careerKey, "data_science_ai");
  assert.equal(senior.targetLevel, "senior");
});
