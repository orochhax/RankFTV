import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const write = process.argv.includes("--write");
const target = resolve("lib/supabase/database.types.ts");

if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error("Defina SUPABASE_PROJECT_REF com a referência exata do projeto.");
  process.exit(1);
}
if (!accessToken) {
  console.error("Defina SUPABASE_ACCESS_TOKEN somente no ambiente de execução.");
  process.exit(1);
}

const cli = resolve("node_modules/supabase/dist/supabase.js");
const generated = spawnSync(process.execPath, [cli,
  "gen", "types", "typescript",
  "--project-id", projectRef,
  "--schema", "public",
], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

if (generated.status !== 0) {
  console.error(generated.stderr?.trim() || generated.error?.message || "Não foi possível gerar os tipos do Supabase.");
  process.exit(generated.status ?? 1);
}

const normalize = (value) => `${value.replaceAll("\r\n", "\n").trimEnd()}\n`;
const next = normalize(generated.stdout);

if (write) {
  writeFileSync(target, next, "utf8");
  console.log("Tipos do Supabase atualizados.");
  process.exit(0);
}

const current = normalize(readFileSync(target, "utf8"));
if (current !== next) {
  console.error("Os tipos do Supabase estão divergentes. Execute npm run types:supabase:generate.");
  process.exit(1);
}
console.log("Tipos do Supabase estão sincronizados.");
