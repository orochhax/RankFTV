-- =============================================================
-- PERFORMANCE — painel pessoal do CEO (privado, /admin/performance).
--
-- Só o dono (CEO) lê/escreve as próprias linhas. A página em si já é
-- protegida por ADMIN_EMAIL; estas políticas RLS garantem que, mesmo
-- via API, ninguém além do dono acessa os dados.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================

-- ── 1. Perfil base (1 linha por usuário) ──────────────────────
CREATE TABLE IF NOT EXISTS perf_profile (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  altura_cm          int,
  data_nascimento    date,
  lado               text,   -- 'esquerda' | 'direita'
  pe_dominante       text,   -- 'esquerdo' | 'direito'
  peso_meta          numeric,
  rating_meta        numeric,
  treinos_semana_meta int,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Hábitos (itens das "metas do dia", configuráveis) ──────
CREATE TABLE IF NOT EXISTS perf_habit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      text NOT NULL,
  tipo       text NOT NULL DEFAULT 'binario',  -- 'binario' | 'numerico'
  alvo       numeric,                          -- só p/ numerico (ex.: 8)
  unidade    text,                             -- só p/ numerico (ex.: 'h','min','L')
  ordem      int NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_habit_user_idx ON perf_habit(user_id, ativo, ordem);

-- ── 3. Registro diário por hábito ─────────────────────────────
-- valor: numerico = quanto fez (ex.: 5 horas); binario = 1 (feito) ou 0.
CREATE TABLE IF NOT EXISTS perf_habit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id   uuid NOT NULL REFERENCES perf_habit(id) ON DELETE CASCADE,
  data       date NOT NULL,
  valor      numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, data)
);
CREATE INDEX IF NOT EXISTS perf_habit_log_user_data_idx ON perf_habit_log(user_id, data);

-- ── 4. Relatório semanal ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS perf_weekly_report (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana_inicio date NOT NULL,             -- segunda-feira da semana
  nota          int,                       -- 0..10
  respostas     jsonb NOT NULL DEFAULT '{}'::jsonb,
  fechado       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, semana_inicio)
);

-- ── 5. Peso & corpo ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perf_weight (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       date NOT NULL,
  peso_kg    numeric NOT NULL,
  gordura_pct numeric,
  cintura_cm numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, data)
);
CREATE INDEX IF NOT EXISTS perf_weight_user_data_idx ON perf_weight(user_id, data);

-- ── 6. Rating de futevôlei (histórico manual) ─────────────────
CREATE TABLE IF NOT EXISTS perf_rating (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       date NOT NULL,
  rating     numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_rating_user_data_idx ON perf_rating(user_id, data);

-- ── 7. Jogos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perf_match (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       date NOT NULL,
  parceiro   text,
  adversario text,
  resultado  text NOT NULL,   -- 'vitoria' | 'derrota'
  placar     text,
  obs        text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_match_user_data_idx ON perf_match(user_id, data);

-- ── 8. Treinos (registro detalhado) ───────────────────────────
CREATE TABLE IF NOT EXISTS perf_training (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        date NOT NULL,
  tipo        text NOT NULL,   -- 'tecnico' | 'fisico' | 'jogo'
  duracao_min int,
  obs         text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_training_user_data_idx ON perf_training(user_id, data);

-- ── 9. Testes físicos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perf_test (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       date NOT NULL,
  tipo_teste text NOT NULL,    -- ex.: 'salto_vertical'
  valor      numeric NOT NULL,
  unidade    text,             -- ex.: 'cm', 's'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perf_test_user_data_idx ON perf_test(user_id, data);

-- ── RLS: cada um só enxerga as próprias linhas ────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'perf_profile','perf_habit','perf_habit_log','perf_weekly_report',
    'perf_weight','perf_rating','perf_match','perf_training','perf_test'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I;', t);
    EXECUTE format(
      'CREATE POLICY owner_all ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());',
      t
    );
  END LOOP;
END $$;

-- Permissão para o role authenticated ler/escrever nas próprias linhas.
-- RLS já restringe ao dono; este GRANT só libera o acesso básico à tabela.
GRANT ALL ON TABLE
  perf_profile, perf_habit, perf_habit_log, perf_weekly_report,
  perf_weight, perf_rating, perf_match, perf_training, perf_test
TO authenticated;

NOTIFY pgrst, 'reload schema';
