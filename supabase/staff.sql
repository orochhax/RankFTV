-- Tabela de staff dos campeonatos
CREATE TABLE IF NOT EXISTS championship_staff (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  can_qrcode      boolean NOT NULL DEFAULT true,
  can_inscricoes  boolean NOT NULL DEFAULT false,
  can_chaveamento boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(championship_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_championship_staff_championship
  ON championship_staff(championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_staff_user
  ON championship_staff(user_id);

ALTER TABLE championship_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS championship_staff_select_related ON championship_staff;
CREATE POLICY championship_staff_select_related ON championship_staff
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_insert_owner ON championship_staff;
CREATE POLICY championship_staff_insert_owner ON championship_staff
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_update_related ON championship_staff;
CREATE POLICY championship_staff_update_related ON championship_staff
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS championship_staff_delete_owner ON championship_staff;
CREATE POLICY championship_staff_delete_owner ON championship_staff
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM championships c
      WHERE c.id = championship_staff.championship_id
        AND c.organizador_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON championship_staff TO authenticated;
GRANT ALL ON championship_staff TO service_role;

NOTIFY pgrst, 'reload schema';
