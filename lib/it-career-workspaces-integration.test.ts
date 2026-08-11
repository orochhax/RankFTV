import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

test("workspace autenticado valida o módulo anterior e entrega arquivos privados", () => {
  const route = read("app", "api", "performance", "study-workspace", "[roadmapId]", "route.ts");
  assert.match(route, /await supabase\.auth\.getUser\(\)/);
  assert.match(route, /eq\("user_id", auth\.user\.id\)/);
  assert.match(route, /pendingByModule/);
  assert.match(route, /Você precisa finalizar o módulo/);
  assert.match(route, /requestedFormat === "files"/);
  assert.match(route, /requestedKind === "full"/);
  assert.match(route, /kind === "full" \? modules/);
  assert.match(route, /rootFolder:/);
  assert.match(route, /select\("item_id, question_type, prompt, options, order_index"\)/);
  assert.match(route, /QUESTION_ITEM_BATCH_SIZE = 40/);
  assert.match(route, /QUESTION_PAGE_SIZE = 500/);
  assert.match(route, /collectWorkspaceRowsByIds<PublicQuestionRow>/);
  assert.match(route, /\.range\(rangeStart, rangeEnd\)/);
  assert.match(route, /practice_exercises/);
  assert.doesNotMatch(route, /correct_option|correct_order|explanation/);
  assert.match(route, /Cache-Control": "private, no-store/);
  assert.doesNotMatch(route, /getPublicUrl|createSignedUrl/);
});

test("migration audita salvamentos e converte o progresso visual", () => {
  const sql = read("supabase", "performance-it-career-workspaces.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS perf_study_workspace_download/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE perf_study_workspace_download FROM PUBLIC, authenticated/);
  assert.match(sql, /SET counts_for_progress = false/);
  assert.match(sql, /content_role IS DISTINCT FROM 'topic'/);
  assert.match(sql, /bundle_kind IN \('base', 'module', 'through_module', 'full'\)/);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS perf_study_workspace_download_kind_valid/);
});

test("interface salva pastas e não oferece conteúdo do módulo bloqueado", () => {
  const workspace = read("components", "performance", "StudiesWorkspace.tsx");
  const folderButton = read("components", "performance", "ItCareerWorkspaceFolderButton.tsx");
  assert.match(workspace, /Baixar projeto completo/);
  assert.match(workspace, /itWorkspaceDownloadUrl\(roadmapId, "full"\)/);
  assert.match(workspace, /Salvar módulo em pasta/);
  assert.match(workspace, /Salvar roadmap até aqui/);
  assert.match(workspace, /!isModuleLocked && <div className="flex shrink-0 items-center gap-1 border-l/);
  assert.match(folderButton, /showDirectoryPicker/);
  assert.match(folderButton, /getDirectoryHandle/);
  assert.match(folderButton, /getFileHandle/);
  assert.match(folderButton, /availableFolderName/);
  assert.match(folderButton, /NotFoundError/);
});
