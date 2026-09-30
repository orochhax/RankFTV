import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("global styles distinguish clickable and disabled controls", () => {
  const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

  assert.match(css, /a\[href\],[\s\S]*button:not\(:disabled\)[\s\S]*\[role="button"\]:not\(\[aria-disabled="true"\]\)[\s\S]*cursor: pointer/);
  assert.match(css, /button:disabled,[\s\S]*\[aria-disabled="true"\][\s\S]*cursor: not-allowed/);
  assert.doesNotMatch(css, /\*\s*\{\s*cursor:\s*pointer/);
});
