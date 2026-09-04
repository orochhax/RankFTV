import assert from "node:assert/strict";
import test from "node:test";
import { makeCsv } from "./csv";

test("CSV escapes quotes and neutralizes spreadsheet formulas", () => {
  const csv = makeCsv(["Nome", "Valor"], [["=IMPORTXML(A1)", '10"']]);
  assert.match(csv, /"'=IMPORTXML/);
  assert.match(csv, /"10"""/);
});
