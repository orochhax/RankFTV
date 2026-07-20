-- Equipe da arena: professor e gerente, além do dono.
-- RODAR NO SQL EDITOR DO SUPABASE.
--
-- O app ainda não tinha nenhum conceito de "professor"/"staff" de arena —
-- só "dono". Esta tabela é o mínimo necessário pra: (1) associar um
-- professor a uma aula, (2) autorizar quem pode finalizar a lista de
-- presença e ver o financeiro de presenças/cobranças da arena além do dono.
-- O dono adiciona diretamente (sem convite pendente) — é o dono quem já
-- está autenticado gerenciando sua própria equipe de confiança.

CREATE TABLE IF NOT EXISTS arena_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id   uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel      text NOT NULL CHECK (papel IN ('professor', 'gerente')),
  status     text NOT NULL DEFAULT 'aceito' CHECK (status IN ('aceito', 'removido')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_id, user_id)
);

CREATE INDEX IF NOT EXISTS arena_staff_arena ON arena_staff (arena_id);
CREATE INDEX IF NOT EXISTS arena_staff_user  ON arena_staff (user_id);

ALTER TABLE arena_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_staff_own_read"  ON arena_staff;
DROP POLICY IF EXISTS "arena_staff_dono_read" ON arena_staff;
DROP POLICY IF EXISTS "arena_staff_dono_write" ON arena_staff;

-- O próprio membro vê onde está cadastrado
CREATE POLICY "arena_staff_own_read" ON arena_staff
  FOR SELECT USING (user_id = auth.uid());

-- Dono da arena vê e gerencia a equipe da própria arena
CREATE POLICY "arena_staff_dono_read" ON arena_staff
  FOR SELECT USING (arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid()));

CREATE POLICY "arena_staff_dono_write" ON arena_staff
  FOR ALL USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  ) WITH CHECK (
    invited_by = auth.uid()
    AND arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON arena_staff TO authenticated;

-- ── Professor responsável pela aula ──────────────────────────────────────
-- Nullable: aula sem professor designado continua só sob responsabilidade
-- do dono. ON DELETE SET NULL — remover o professor da equipe não deve
-- apagar a aula nem quebrar o histórico de presenças já registrado.
ALTER TABLE arena_classes
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS arena_classes_professor ON arena_classes (professor_id);

-- Professor/gerente autorizado também pode gerenciar as aulas da arena (até
-- então só o dono podia). Mantém a policy antiga (dono) e soma uma nova.
DROP POLICY IF EXISTS "arena_classes_staff_write" ON arena_classes;
CREATE POLICY "arena_classes_staff_write" ON arena_classes
  FOR ALL USING (
    arena_id IN (
      SELECT arena_id FROM arena_staff
      WHERE user_id = auth.uid() AND papel = 'gerente' AND status = 'aceito'
    )
  ) WITH CHECK (
    arena_id IN (
      SELECT arena_id FROM arena_staff
      WHERE user_id = auth.uid() AND papel = 'gerente' AND status = 'aceito'
    )
  );

-- Professor/gerente autorizado enxerga as presenças da arena (até então só
-- o dono via "arena_attendance_dono_read").
DROP POLICY IF EXISTS "arena_attendance_staff_read" ON arena_attendance;
CREATE POLICY "arena_attendance_staff_read" ON arena_attendance
  FOR SELECT USING (
    arena_id IN (
      SELECT arena_id FROM arena_staff WHERE user_id = auth.uid() AND status = 'aceito'
    )
  );

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'add-arena-staff done';
