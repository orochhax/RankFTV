-- =============================================================
-- RANKFTV — Campeonatos criados na plataforma (Fase 0: CRUD básico)
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez).
--
-- O organizador é o usuário logado (auth.users). Cada campeonato tem
-- N categorias. Inscrições/pagamento/duplas entram na Fase 1.
-- =============================================================

-- ── 1. TABELAS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS championships (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organizador_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            text        NOT NULL,
  descricao       text        NOT NULL DEFAULT '',
  regulamento     text        NOT NULL DEFAULT '',
  data_inicio     date        NOT NULL,
  data_fim        date        NOT NULL,
  cidade          text        NOT NULL,
  estado          text        NOT NULL,
  local           text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho', 'inscricoes_abertas', 'em_andamento', 'encerrado')),
  taxa_plataforma int         NOT NULL DEFAULT 10,
  banner_from     text        NOT NULL DEFAULT 'from-blue-500',
  banner_to       text        NOT NULL DEFAULT 'to-cyan-400',
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS championship_categories (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id  uuid        NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  genero           text        NOT NULL CHECK (genero IN ('masculino', 'feminino', 'mista')),
  valor_inscricao  int         NOT NULL DEFAULT 0,
  corte_rating_min int         NOT NULL DEFAULT 0,
  corte_rating_max int         NOT NULL DEFAULT 9999,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_championships_organizador ON championships(organizador_id);
CREATE INDEX IF NOT EXISTS idx_champ_categories_champ   ON championship_categories(championship_id);

-- ── 2. SEGURANÇA (RLS) ────────────────────────────────────────

ALTER TABLE championships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_categories  ENABLE ROW LEVEL SECURITY;

-- championships: qualquer um vê os publicados; o dono vê também os seus rascunhos
DROP POLICY IF EXISTS championships_select ON championships;
CREATE POLICY championships_select ON championships FOR SELECT
  USING (status <> 'rascunho' OR organizador_id = auth.uid());

-- só dá pra criar em nome de si mesmo
DROP POLICY IF EXISTS championships_insert ON championships;
CREATE POLICY championships_insert ON championships FOR INSERT
  WITH CHECK (organizador_id = auth.uid());

-- só o dono edita/apaga
DROP POLICY IF EXISTS championships_update ON championships;
CREATE POLICY championships_update ON championships FOR UPDATE
  USING (organizador_id = auth.uid()) WITH CHECK (organizador_id = auth.uid());

DROP POLICY IF EXISTS championships_delete ON championships;
CREATE POLICY championships_delete ON championships FOR DELETE
  USING (organizador_id = auth.uid());

-- categorias: visíveis se o campeonato pai for visível
DROP POLICY IF EXISTS champ_categories_select ON championship_categories;
CREATE POLICY champ_categories_select ON championship_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id
      AND (c.status <> 'rascunho' OR c.organizador_id = auth.uid())
  ));

-- categorias: só o dono do campeonato pai escreve
DROP POLICY IF EXISTS champ_categories_insert ON championship_categories;
CREATE POLICY champ_categories_insert ON championship_categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ));

DROP POLICY IF EXISTS champ_categories_update ON championship_categories;
CREATE POLICY champ_categories_update ON championship_categories FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ));

DROP POLICY IF EXISTS champ_categories_delete ON championship_categories;
CREATE POLICY champ_categories_delete ON championship_categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ));

-- ── 3. GRANTS ─────────────────────────────────────────────────

GRANT SELECT ON championships, championship_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON championships, championship_categories TO authenticated;
