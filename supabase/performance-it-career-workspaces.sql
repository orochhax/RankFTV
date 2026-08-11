-- Workspaces executáveis dos roadmaps determinísticos de TI.
-- Execute depois de performance-it-career-roadmaps.sql.
-- Os arquivos são gerados no servidor a partir do snapshot; esta tabela
-- registra somente auditoria de downloads autorizados, nunca conteúdo ou respostas.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- A experiencia de TI passa a usar o site somente como mapa visual. Projetos,
-- atividades e perguntas ficam nos arquivos do workspace; somente assuntos e
-- revisoes contam para progresso e para liberar o modulo seguinte. O trigger e
-- suspenso apenas durante esta conversao controlada de snapshots existentes.
ALTER TABLE perf_study_roadmap_item
  DISABLE TRIGGER perf_guard_it_study_item_completion_update_trigger;
UPDATE perf_study_roadmap_item AS item
SET counts_for_progress = false
FROM perf_study_roadmap AS roadmap
WHERE roadmap.id = item.roadmap_id
  AND roadmap.user_id = item.user_id
  AND roadmap.roadmap_kind = 'it_career'
  AND item.content_role IS DISTINCT FROM 'topic'
  AND item.content_role IS DISTINCT FROM 'review'
  AND item.counts_for_progress;
ALTER TABLE perf_study_roadmap_item
  ENABLE TRIGGER perf_guard_it_study_item_completion_update_trigger;

CREATE TABLE IF NOT EXISTS perf_study_workspace_download (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL,
  module_id uuid,
  bundle_kind text NOT NULL,
  artifact_sha256 text NOT NULL,
  template_version integer NOT NULL,
  workspace_generator_version integer NOT NULL DEFAULT 2,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perf_study_workspace_download_kind_valid CHECK (
    bundle_kind IN ('base', 'module', 'through_module', 'full')
  ),
  CONSTRAINT perf_study_workspace_download_hash_valid CHECK (
    artifact_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT perf_study_workspace_download_template_valid CHECK (
    template_version > 0
  ),
  CONSTRAINT perf_study_workspace_download_generator_valid CHECK (
    workspace_generator_version > 0
  ),
  CONSTRAINT perf_study_workspace_download_roadmap_owner_fk
    FOREIGN KEY (roadmap_id, user_id)
    REFERENCES perf_study_roadmap(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT perf_study_workspace_download_module_owner_fk
    FOREIGN KEY (module_id, user_id, roadmap_id)
    REFERENCES perf_study_roadmap_module(id, user_id, roadmap_id)
    ON DELETE CASCADE,
  CONSTRAINT perf_study_workspace_download_module_kind_valid CHECK (
    (bundle_kind = 'module' AND module_id IS NOT NULL)
    OR (bundle_kind IN ('base', 'through_module', 'full'))
  )
);

ALTER TABLE perf_study_workspace_download
  ADD COLUMN IF NOT EXISTS workspace_generator_version integer;
ALTER TABLE perf_study_workspace_download
  ALTER COLUMN workspace_generator_version SET DEFAULT 2;
UPDATE perf_study_workspace_download
SET workspace_generator_version = 1
WHERE workspace_generator_version IS NULL;
ALTER TABLE perf_study_workspace_download
  ALTER COLUMN workspace_generator_version SET NOT NULL;
ALTER TABLE perf_study_workspace_download
  DROP CONSTRAINT IF EXISTS perf_study_workspace_download_generator_valid;
ALTER TABLE perf_study_workspace_download
  ADD CONSTRAINT perf_study_workspace_download_generator_valid CHECK (
    workspace_generator_version > 0
  );

-- Atualiza instalações que já executaram uma versão anterior desta migration.
ALTER TABLE perf_study_workspace_download
  DROP CONSTRAINT IF EXISTS perf_study_workspace_download_kind_valid;
ALTER TABLE perf_study_workspace_download
  ADD CONSTRAINT perf_study_workspace_download_kind_valid CHECK (
    bundle_kind IN ('base', 'module', 'through_module', 'full')
  );
ALTER TABLE perf_study_workspace_download
  DROP CONSTRAINT IF EXISTS perf_study_workspace_download_module_kind_valid;
ALTER TABLE perf_study_workspace_download
  ADD CONSTRAINT perf_study_workspace_download_module_kind_valid CHECK (
    (bundle_kind = 'module' AND module_id IS NOT NULL)
    OR (bundle_kind IN ('base', 'through_module', 'full'))
  );

CREATE INDEX IF NOT EXISTS perf_study_workspace_download_owner_idx
  ON perf_study_workspace_download(user_id, roadmap_id, downloaded_at DESC);

ALTER TABLE perf_study_workspace_download ENABLE ROW LEVEL SECURITY;
ALTER TABLE perf_study_workspace_download FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS perf_study_workspace_download_owner_read
  ON perf_study_workspace_download;
CREATE POLICY perf_study_workspace_download_owner_read
  ON perf_study_workspace_download
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE perf_study_workspace_download FROM PUBLIC, authenticated;
GRANT SELECT ON TABLE perf_study_workspace_download TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
