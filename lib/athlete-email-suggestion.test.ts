import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { setAthleteEmail } from "./athlete-email-suggestion";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("a sugestão altera somente o e-mail do atleta escolhido", () => {
  const original = {
    comprador_nome: "Julia",
    comprador_email: "",
    parceiro_email: "carlos@exemplo.com",
  };

  const updated = setAthleteEmail(original, "comprador_email", "conta@exemplo.com");

  assert.deepEqual(updated, {
    comprador_nome: "Julia",
    comprador_email: "conta@exemplo.com",
    parceiro_email: "carlos@exemplo.com",
  });
  assert.deepEqual(original, {
    comprador_nome: "Julia",
    comprador_email: "",
    parceiro_email: "carlos@exemplo.com",
  });
});

test("o e-mail sugerido continua editável", () => {
  const suggested = setAthleteEmail({}, "parceiro_email", "conta@exemplo.com");
  const edited = setAthleteEmail(suggested, "parceiro_email", "parceiro@exemplo.com");

  assert.equal(edited.parceiro_email, "parceiro@exemplo.com");
});

test("o checkout mostra a sugestão apenas como ação para cada atleta", () => {
  const page = source("app/campeonatos/[id]/comprar/page.tsx");
  const form = source("components/campeonatos/IngressoAtletaForm.tsx");

  assert.match(page, /authenticatedEmail=\{user\?\.email\?\.trim\(\) \|\| null\}/);
  assert.match(form, /value=\{values\.comprador_email \?\? ""\}/);
  assert.match(form, /value=\{values\.parceiro_email \?\? ""\}/);
  assert.doesNotMatch(form, /defaultValue=\{authenticatedEmail/);
  assert.match(form, /onUse=\{\(\) => updateAthleteEmail\("comprador_email", emailDaConta\)\}/);
  assert.match(form, /onUse=\{\(\) => updateAthleteEmail\("parceiro_email", emailDaConta\)\}/);
  assert.match(form, /onChange=\{\(event\) => updateAthleteEmail\("comprador_email", event\.target\.value\)\}/);
  assert.match(form, /onChange=\{\(event\) => updateAthleteEmail\("parceiro_email", event\.target\.value\)\}/);
});
