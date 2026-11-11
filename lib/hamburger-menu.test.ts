import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("HamburgerMenu exige isLoggedIn para exibir Sair e mostra Entrar/Criar conta ao visitante", () => {
  const menu = source("components/home/HamburgerMenu.tsx");
  const home = source("app/page.tsx");
  const testMobileHome = source("app/teste-home-mobile/page.tsx");

  assert.match(menu, /isLoggedIn:\s*boolean/);
  assert.match(menu, /isLoggedIn \?/);
  assert.match(menu, /href="\/login"/);
  assert.match(menu, /href="\/cadastro"/);
  assert.match(home, /<HamburgerMenu[\s\S]*isLoggedIn=\{!!user\}/);
  assert.match(testMobileHome, /<HamburgerMenu[\s\S]*isLoggedIn=\{!!user\}/);
});
