-- Fase D: Presença em treinos da arena.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- ── arena_classes ─────────────────────────────────────────────────────────────
-- Aulas/treinos recorrentes ou pontuais da arena.

CREATE TABLE IF NOT EXISTS arena_classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id    uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  dias_semana integer[] DEFAULT '{}',   -- 0=Dom, 1=Seg, ..., 6=Sáb
  horario     text,                     -- ex: "19:00"
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_classes_arena ON arena_classes (arena_id);

ALTER TABLE arena_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_classes_public_read"  ON arena_classes;
DROP POLICY IF EXISTS "arena_classes_dono_write"   ON arena_classes;

CREATE POLICY "arena_classes_public_read" ON arena_classes FOR SELECT USING (true);
CREATE POLICY "arena_classes_dono_write"  ON arena_classes FOR ALL USING (
  arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
) WITH CHECK (
  arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON arena_classes TO authenticated;

-- ── arena_attendance ──────────────────────────────────────────────────────────
-- Presença do aluno numa aula num dia específico.
-- 1 registro por aluno por aula por data.

CREATE TABLE IF NOT EXISTS arena_attendance (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES arena_classes(id) ON DELETE CASCADE,
  arena_id   uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id, data)
);

CREATE INDEX IF NOT EXISTS arena_attendance_class   ON arena_attendance (class_id, data);
CREATE INDEX IF NOT EXISTS arena_attendance_user    ON arena_attendance (user_id);
CREATE INDEX IF NOT EXISTS arena_attendance_arena   ON arena_attendance (arena_id, data);

ALTER TABLE arena_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_attendance_own"       ON arena_attendance;
DROP POLICY IF EXISTS "arena_attendance_dono_read" ON arena_attendance;

-- Aluno vê e registra sua própria presença
CREATE POLICY "arena_attendance_own" ON arena_attendance
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dono da arena vê todas as presenças
CREATE POLICY "arena_attendance_dono_read" ON arena_attendance
  FOR SELECT USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT, INSERT ON arena_attendance TO authenticated;

NOTIFY migrations, 'add-arena-attendance done';
