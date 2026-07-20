// Verifica, de forma estrutural (sem precisar de um servidor Next.js
// rodando), que a página administrativa de cobrança manual foi realmente
// removida e não deixou nenhum caminho de volta — não só escondida na UI.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const file = (p: string) => path.join(ROOT, p);
const read = (p: string) => fs.readFileSync(file(p), "utf-8");

describe("/arena/[handle]/financeiro — removida (404 automático do App Router)", () => {
  test("o arquivo de rota não existe mais — sem arquivo, Next.js 404 em qualquer acesso direto", () => {
    assert.equal(fs.existsSync(file("app/arena/[handle]/financeiro/page.tsx")), false);
    assert.equal(fs.existsSync(file("app/arena/[handle]/financeiro")), false);
  });

  test("a rota legada /arena/financeiro (redirect antigo) também foi removida", () => {
    assert.equal(fs.existsSync(file("app/arena/financeiro")), false);
  });

  test("o arquivo de actions da página removida não existe mais — nada pra chamar", () => {
    assert.equal(fs.existsSync(file("app/arena/financeiro/actions.ts")), false);
  });

  test("o componente cliente da página removida não existe mais", () => {
    assert.equal(fs.existsSync(file("components/arena/FinanceiroArenaClient.tsx")), false);
  });
});

describe("Nenhum link/menu leva mais pra /arena/[handle]/financeiro", () => {
  test("a navegação da arena (arena-nav-items.ts) não tem mais o item Financeiro do organizador", () => {
    const conteudo = read("components/arena/arena-nav-items.ts");
    assert.ok(!conteudo.includes("/financeiro`"), "arena-nav-items.ts ainda referencia uma rota /financeiro");
  });

  test("nenhum arquivo do app/componentes referencia a rota administrativa removida", () => {
    const alvos = ["app", "components", "lib"];
    const ofensores: string[] = [];
    function varrer(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { varrer(full); continue; }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (full.endsWith("arena-financeiro-removal.test.ts")) continue;
        const conteudo = fs.readFileSync(full, "utf-8");
        // "/arena/${...}/financeiro" ou "/arena/[handle]/financeiro" — nunca
        // "/arenas/..." (financeiro do aluno, que deve continuar existindo).
        if (/\/arena\/(\$\{[^}]+\}|\[handle\])\/financeiro/.test(conteudo)) ofensores.push(full);
      }
    }
    for (const alvo of alvos) varrer(file(alvo));
    assert.deepEqual(ofensores, []);
  });
});

describe("Actions antigas de cobrança manual não existem mais no código", () => {
  test("definirValorMensalidade não é exportado por nenhum arquivo do projeto", () => {
    assertNenhumaOcorrencia("definirValorMensalidade");
  });
  test("emitirMensalidade não é exportado por nenhum arquivo do projeto", () => {
    assertNenhumaOcorrencia("emitirMensalidade");
  });

  function assertNenhumaOcorrencia(nome: string) {
    const ofensores: string[] = [];
    function varrer(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { varrer(full); continue; }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (full.endsWith("arena-financeiro-removal.test.ts")) continue;
        if (fs.readFileSync(full, "utf-8").includes(nome)) ofensores.push(full);
      }
    }
    varrer(file("app"));
    varrer(file("components"));
    varrer(file("lib"));
    assert.deepEqual(ofensores, []);
  }
});

describe("Migration trava, em SQL, a escrita direta que sustentava a cobrança manual", () => {
  const sql = read("supabase/add-arena-plan-lifecycle.sql");

  test("revoga INSERT/UPDATE/DELETE de arena_students pro authenticated", () => {
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON arena_students FROM authenticated/);
  });
  test("revoga INSERT/UPDATE/DELETE de student_charges pro authenticated", () => {
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON student_charges FROM authenticated/);
  });
  test("remove a policy antiga que dava UPDATE irrestrito ao dono em arena_students", () => {
    assert.match(sql, /DROP POLICY IF EXISTS "arena_students_dono_write" ON arena_students/);
  });
  test("remove a policy antiga que dava UPDATE irrestrito ao dono em student_charges", () => {
    assert.match(sql, /DROP POLICY IF EXISTS "student_charges_dono" ON student_charges/);
  });
  test("aluno e dono continuam com SELECT (histórico financeiro visível)", () => {
    assert.match(sql, /GRANT SELECT ON arena_students TO authenticated/);
    assert.match(sql, /GRANT SELECT ON student_charges TO authenticated/);
  });
});

describe("/arenas/[handle]/financeiro (do aluno) continua existindo", () => {
  test("a página financeira do próprio aluno não foi removida", () => {
    assert.equal(fs.existsSync(file("app/arenas/[handle]/financeiro/page.tsx")), true);
  });
});
