-- Fase C: módulo Arena — dono + alunos.
-- RODAR NO SQL EDITOR DO SUPABASE.

-- ── arenas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arenas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  handle       text NOT NULL UNIQUE,
  cidade       text NOT NULL,
  estado       text NOT NULL,
  descricao    text,
  avatar_url   text,
  banner_url   text,
  invite_code  text NOT NULL DEFAULT upper(substring(gen_random_uuid()::text FROM 1 FOR 8)),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arenas_dono ON arenas (dono_id);
CREATE INDEX IF NOT EXISTS arenas_handle ON arenas (handle);

ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arenas_public_read"   ON arenas;
DROP POLICY IF EXISTS "arenas_owner_write"   ON arenas;
DROP POLICY IF EXISTS "arenas_owner_update"  ON arenas;

CREATE POLICY "arenas_public_read"  ON arenas FOR SELECT USING (true);
CREATE POLICY "arenas_owner_insert" ON arenas FOR INSERT WITH CHECK (dono_id = auth.uid());
CREATE POLICY "arenas_owner_update" ON arenas FOR UPDATE USING (dono_id = auth.uid()) WITH CHECK (dono_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON arenas TO authenticated;

-- ── arena_accounts ───────────────────────────────────────────────────────────
-- Dados financeiros do dono (para split da mensalidade via Asaas).

CREATE TABLE IF NOT EXISTS arena_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id         uuid NOT NULL UNIQUE REFERENCES arenas(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf_cnpj         text NOT NULL,
  telefone         text NOT NULL,
  chave_pix        text,
  asaas_account_id text,
  asaas_wallet_id  text,
  habilitado       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arena_accounts_user ON arena_accounts (user_id);

ALTER TABLE arena_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_accounts_owner" ON arena_accounts;
CREATE POLICY "arena_accounts_owner" ON arena_accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON arena_accounts TO authenticated;

-- ── arena_students ───────────────────────────────────────────────────────────
-- Vínculo aluno ↔ arena. status: pendente → ativo (aceito pelo dono) | inativo.

CREATE TABLE IF NOT EXISTS arena_students (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id         uuid NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('ativo', 'pendente', 'inativo')),
  valor_mensalidade numeric(10,2),
  data_entrada     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arena_id, user_id)
);

CREATE INDEX IF NOT EXISTS arena_students_arena ON arena_students (arena_id);
CREATE INDEX IF NOT EXISTS arena_students_user  ON arena_students (user_id);

ALTER TABLE arena_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arena_students_own"        ON arena_students;
DROP POLICY IF EXISTS "arena_students_dono_read"  ON arena_students;
DROP POLICY IF EXISTS "arena_students_dono_write" ON arena_students;

-- Aluno vê e gerencia o próprio vínculo
CREATE POLICY "arena_students_own" ON arena_students
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dono da arena vê e gerencia todos os alunos da sua arena
CREATE POLICY "arena_students_dono_read" ON arena_students
  FOR SELECT USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

CREATE POLICY "arena_students_dono_write" ON arena_students
  FOR UPDATE USING (
    arena_id IN (SELECT id FROM arenas WHERE dono_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON arena_students TO authenticated;

NOTIFY migrations, 'add-arenas done';
