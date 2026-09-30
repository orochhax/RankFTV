import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("featured championship cards remain clickable while the carousel supports dragging", () => {
  const controls = source("components/home/useCarouselControls.ts");
  const featured = source("components/home/DestaquesCarousel.tsx");
  const pointerDown = controls.slice(
    controls.indexOf("function onPointerDown"),
    controls.indexOf("function onPointerMove"),
  );

  assert.doesNotMatch(pointerDown, /setPointerCapture/);
  assert.match(controls, /function onPointerMove[\s\S]*setPointerCapture/);
  assert.match(controls, /function onClickCapture[\s\S]*event\.preventDefault\(\)/);
  assert.match(featured, /<Link href=\{`\/campeonatos\/\$\{camp\.id\}`\}/);
});
