import assert from "node:assert/strict";
import test from "node:test";
import { isPublicFunnelEvent, validOptionalUuid } from "./public-funnel";

test("public funnel accepts only the documented stages", () => {
  assert.equal(isPublicFunnelEvent("category_selected"), true);
  assert.equal(isPublicFunnelEvent("email"), false);
});

test("public funnel identifiers cannot carry arbitrary personal data", () => {
  assert.equal(validOptionalUuid("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(validOptionalUuid("person@example.com"), false);
});
