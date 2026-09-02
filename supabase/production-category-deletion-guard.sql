-- RankFTV V1: uma categoria somente pode ser excluida enquanto estiver vazia.
-- Inscricoes em qualquer estado, credenciais e chaveamentos sao historico
-- operacional/financeiro e exigem um fluxo explicito de cancelamento.

CREATE OR REPLACE FUNCTION block_nonempty_championship_category_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM teams
    WHERE category_id = OLD.id AND championship_id = OLD.championship_id
  ) OR EXISTS (
    SELECT 1 FROM registrations
    WHERE category_id = OLD.id AND championship_id = OLD.championship_id
  ) OR EXISTS (
    SELECT 1 FROM athlete_tickets
    WHERE category_id = OLD.id AND championship_id = OLD.championship_id
  ) OR EXISTS (
    SELECT 1 FROM bracket_participants
    WHERE category_id = OLD.id AND championship_id = OLD.championship_id
  ) OR EXISTS (
    SELECT 1 FROM bracket_matches
    WHERE category_id = OLD.id AND championship_id = OLD.championship_id
  ) THEN
    RAISE EXCEPTION 'CATEGORY_HAS_DEPENDENCIES'
      USING ERRCODE = '23503',
            CONSTRAINT = 'championship_categories_has_history';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS championship_categories_block_nonempty_delete
  ON championship_categories;
CREATE TRIGGER championship_categories_block_nonempty_delete
  BEFORE DELETE ON championship_categories
  FOR EACH ROW EXECUTE FUNCTION block_nonempty_championship_category_delete();

REVOKE ALL ON FUNCTION block_nonempty_championship_category_delete()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-category-deletion-guard done';
