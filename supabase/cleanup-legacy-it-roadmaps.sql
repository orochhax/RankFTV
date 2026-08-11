-- LIMPEZA DESTRUTIVA E SELETIVA DOS ROADMAPS ANTIGOS DE HABILIDADE/TI.
--
-- Execute este arquivo somente DEPOIS de:
--   1. aplicar performance-it-career-roadmaps.sql;
--   2. aplicar fix-study-roadmap-delete-cascade.sql;
--   3. publicar o codigo que nao inicia mais roadmaps de TI pela IA;
--   4. executar separadamente as consultas de preview abaixo e confirmar que
--      os registros listados sao realmente os roadmaps antigos a remover.
--   5. preencher as listas explicitas de roadmap_id ou generation_id junto
--      com user_id na parte destrutiva.
-- ATENCAO: executar este arquivo inteiro nao pausa depois do preview; a parte
-- destrutiva sera iniciada logo em seguida. Com a lista vazia, ele aborta sem
-- excluir nada.
--
-- A limpeza nunca usa titulo, descricao ou palavras-chave. Um roadmap so e
-- removido quando TODAS estas evidencias concordam:
--   - roadmap_kind = 'legacy_skill';
--   - roadmap.source = 'ai';
--   - generation.origin = 'ai';
--   - generation.answers.roadmapType = 'skill';
-- Idiomas, importacoes, roadmaps manuais e registros desconhecidos ficam fora.

-- PREVIEW: distribuicao que deve ser revisada antes da parte destrutiva.
SELECT roadmap_kind, source, count(*) AS roadmap_count
FROM perf_study_roadmap
GROUP BY roadmap_kind, source
ORDER BY roadmap_kind, source;

SELECT
  roadmap.id,
  roadmap.user_id,
  roadmap.title,
  roadmap.status,
  roadmap.created_at,
  generation.id AS generation_id,
  generation.status AS generation_status,
  generation.answers ->> 'subject' AS subject,
  generation.answers ->> 'goalDetail' AS goal_detail
FROM perf_study_roadmap AS roadmap
JOIN perf_study_roadmap_generation AS generation
  ON generation.id = roadmap.generation_id
 AND generation.user_id = roadmap.user_id
WHERE roadmap.roadmap_kind = 'legacy_skill'
  AND roadmap.source = 'ai'
  AND generation.origin = 'ai'
  AND generation.answers ->> 'roadmapType' = 'skill'
ORDER BY roadmap.user_id, roadmap.created_at, roadmap.id;

SELECT
  generation.status,
  count(*) AS generation_count
FROM perf_study_roadmap_generation AS generation
WHERE generation.origin = 'ai'
  AND generation.answers ->> 'roadmapType' = 'skill'
GROUP BY generation.status
ORDER BY generation.status;

-- PREVIEW de geracoes sem roadmap salvo (rascunhos/erros antigos). Elas exigem
-- uma allowlist separada porque nao possuem roadmap_id.
SELECT
  generation.id AS generation_id,
  generation.user_id,
  generation.status,
  generation.preview_title,
  generation.created_at,
  generation.answers ->> 'subject' AS subject,
  generation.answers ->> 'goalDetail' AS goal_detail
FROM perf_study_roadmap_generation AS generation
WHERE generation.origin = 'ai'
  AND generation.answers ->> 'roadmapType' = 'skill'
  AND NOT EXISTS (
    SELECT 1
    FROM perf_study_roadmap AS roadmap
    WHERE roadmap.generation_id = generation.id
  )
ORDER BY generation.user_id, generation.created_at, generation.id;

-- PARTE DESTRUTIVA. A transacao inteira e revertida se houver erro ou lock.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- LISTA DE APROVACAO OBRIGATORIA.
CREATE TEMP TABLE cleanup_legacy_it_approved_targets (
  roadmap_id uuid PRIMARY KEY,
  user_id uuid NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE cleanup_legacy_it_approved_generation_targets (
  generation_id uuid PRIMARY KEY,
  user_id uuid NOT NULL
) ON COMMIT DROP;

-- Copie do preview somente os pares que voce confirmou serem roadmaps antigos
-- de TI. Nunca aprove apenas por palavras no titulo. Exemplo:
-- INSERT INTO cleanup_legacy_it_approved_targets(roadmap_id, user_id) VALUES
--   ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
-- INSERT INTO cleanup_legacy_it_approved_generation_targets(generation_id, user_id) VALUES
--   ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cleanup_legacy_it_approved_targets)
     AND NOT EXISTS (SELECT 1 FROM cleanup_legacy_it_approved_generation_targets) THEN
    RAISE EXCEPTION 'Listas de aprovacao vazias. Revise os previews e informe IDs + user_id explicitamente.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM cleanup_legacy_it_approved_targets AS approved
    LEFT JOIN perf_study_roadmap AS roadmap
      ON roadmap.id = approved.roadmap_id
     AND roadmap.user_id = approved.user_id
    LEFT JOIN perf_study_roadmap_generation AS generation
      ON generation.id = roadmap.generation_id
     AND generation.user_id = roadmap.user_id
    WHERE roadmap.id IS NULL
       OR roadmap.roadmap_kind IS DISTINCT FROM 'legacy_skill'
       OR roadmap.source IS DISTINCT FROM 'ai'
       OR generation.origin IS DISTINCT FROM 'ai'
       OR generation.answers ->> 'roadmapType' IS DISTINCT FROM 'skill'
  ) THEN
    RAISE EXCEPTION 'A lista contem um registro inexistente ou que nao atende a prova conservadora de legado.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM cleanup_legacy_it_approved_generation_targets AS approved
    LEFT JOIN perf_study_roadmap_generation AS generation
      ON generation.id = approved.generation_id
     AND generation.user_id = approved.user_id
    WHERE generation.id IS NULL
       OR generation.origin IS DISTINCT FROM 'ai'
       OR generation.answers ->> 'roadmapType' IS DISTINCT FROM 'skill'
       OR EXISTS (
         SELECT 1
         FROM perf_study_roadmap AS roadmap
         WHERE roadmap.generation_id = approved.generation_id
       )
  ) THEN
    RAISE EXCEPTION 'A lista de geracoes contem registro invalido ou ja vinculado a um roadmap; use a lista de roadmaps nesse caso.';
  END IF;
END $$;

CREATE TEMP TABLE cleanup_legacy_it_roadmap_targets
ON COMMIT DROP
AS
SELECT
  roadmap.id,
  roadmap.user_id,
  roadmap.status,
  roadmap.generation_id
FROM perf_study_roadmap AS roadmap
JOIN cleanup_legacy_it_approved_targets AS approved
  ON approved.roadmap_id = roadmap.id
 AND approved.user_id = roadmap.user_id
JOIN perf_study_roadmap_generation AS generation
  ON generation.id = roadmap.generation_id
 AND generation.user_id = roadmap.user_id
WHERE roadmap.roadmap_kind = 'legacy_skill'
  AND roadmap.source = 'ai'
  AND generation.origin = 'ai'
  AND generation.answers ->> 'roadmapType' = 'skill';

-- Nao removemos uma linha enquanto a geracao aprovada ainda pode estar sendo
-- processada. Outros rascunhos e outros usuarios nao bloqueiam esta limpeza.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM perf_study_roadmap_generation AS generation
    WHERE generation.status = 'generating'
      AND (
        EXISTS (
          SELECT 1
          FROM cleanup_legacy_it_roadmap_targets AS target
          WHERE target.generation_id = generation.id
            AND target.user_id = generation.user_id
        )
        OR EXISTS (
          SELECT 1
          FROM cleanup_legacy_it_approved_generation_targets AS approved
          WHERE approved.generation_id = generation.id
            AND approved.user_id = generation.user_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Uma geracao aprovada ainda esta em andamento. Aguarde ou finalize-a antes da limpeza.';
  END IF;
END $$;

CREATE TEMP TABLE cleanup_legacy_it_affected_users
ON COMMIT DROP
AS
SELECT DISTINCT user_id
FROM cleanup_legacy_it_roadmap_targets
WHERE status = 'active';

CREATE TEMP TABLE cleanup_legacy_it_results (
  entity text PRIMARY KEY,
  affected_count bigint NOT NULL
) ON COMMIT DROP;

-- As FKs existentes removem modulos, itens, perguntas, tentativas e checks.
-- O hotfix torna os triggers de pergunta seguros durante o cascade; eles nao
-- sao desabilitados aqui. perf_activity e preservada e perde apenas sua FK de
-- item pelo ON DELETE SET NULL.
WITH deleted AS (
  DELETE FROM perf_study_roadmap AS roadmap
  USING cleanup_legacy_it_roadmap_targets AS target
  WHERE roadmap.id = target.id
    AND roadmap.user_id = target.user_id
  RETURNING roadmap.id
)
INSERT INTO cleanup_legacy_it_results(entity, affected_count)
SELECT 'roadmaps', count(*) FROM deleted;

-- Se o roadmap removido era o ativo, ativa o roadmap sobrevivente mais novo.
-- Idiomas tem prioridade; depois novos templates e, por ultimo, desconhecidos.
WITH replacement AS (
  SELECT DISTINCT ON (roadmap.user_id)
    roadmap.user_id,
    roadmap.id
  FROM perf_study_roadmap AS roadmap
  JOIN cleanup_legacy_it_affected_users AS affected
    ON affected.user_id = roadmap.user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM perf_study_roadmap AS active_roadmap
    WHERE active_roadmap.user_id = roadmap.user_id
      AND active_roadmap.status = 'active'
  )
  ORDER BY
    roadmap.user_id,
    CASE roadmap.roadmap_kind
      WHEN 'language' THEN 0
      WHEN 'it_career' THEN 1
      WHEN 'legacy_unknown' THEN 2
      ELSE 3
    END,
    roadmap.created_at DESC,
    roadmap.id DESC
), activated AS (
  UPDATE perf_study_roadmap AS roadmap
  SET status = 'active',
      updated_at = now()
  FROM replacement
  WHERE roadmap.id = replacement.id
    AND roadmap.user_id = replacement.user_id
  RETURNING roadmap.id
)
INSERT INTO cleanup_legacy_it_results(entity, affected_count)
SELECT 'reactivated_roadmaps', count(*) FROM activated;

-- Geracoes sao independentes do roadmap. Excluimos apenas as comprovadamente
-- skill e somente depois que nenhum roadmap sobrevivente ainda as referencia.
WITH deleted AS (
  DELETE FROM perf_study_roadmap_generation AS generation
  USING (
    SELECT DISTINCT generation_id, user_id
    FROM cleanup_legacy_it_roadmap_targets
    WHERE generation_id IS NOT NULL
    UNION
    SELECT generation_id, user_id
    FROM cleanup_legacy_it_approved_generation_targets
  ) AS target
  WHERE generation.id = target.generation_id
    AND generation.user_id = target.user_id
    AND generation.origin = 'ai'
    AND generation.answers ->> 'roadmapType' = 'skill'
    AND NOT EXISTS (
      SELECT 1
      FROM perf_study_roadmap AS roadmap
      WHERE roadmap.generation_id = generation.id
    )
  RETURNING generation.id
)
INSERT INTO cleanup_legacy_it_results(entity, affected_count)
SELECT 'generations', count(*) FROM deleted;

-- Resultado da execucao. language, legacy_unknown, import e manual nao entram
-- nas clausulas DELETE acima.
SELECT entity, affected_count
FROM cleanup_legacy_it_results
ORDER BY entity;

SELECT roadmap_kind, source, count(*) AS remaining_roadmaps
FROM perf_study_roadmap
GROUP BY roadmap_kind, source
ORDER BY roadmap_kind, source;

COMMIT;
