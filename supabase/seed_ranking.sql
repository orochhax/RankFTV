-- =============================================================
-- RANKFTV — Ranking Externo: Schema + Seed
-- Execute no Supabase SQL Editor (pode rodar mais de uma vez)
-- =============================================================

-- ── 1. TABELAS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_athletes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text        NOT NULL,
  instagram   text        UNIQUE,
  genero      text        NOT NULL CHECK (genero IN ('masculino', 'feminino')),
  user_id     uuid        REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_tournaments (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_circuito text        NOT NULL,
  tier          text        NOT NULL DEFAULT 'nacional'
                              CHECK (tier IN ('nacional', 'regional', 'local')),
  data          date        NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (nome_circuito, data)
);

CREATE TABLE IF NOT EXISTS external_results (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id  uuid        NOT NULL REFERENCES external_tournaments(id) ON DELETE CASCADE,
  athlete_id     uuid        NOT NULL REFERENCES external_athletes(id),
  colocacao      int         NOT NULL CHECK (colocacao IN (1, 2, 3)),
  parceiro_nome  text,
  pontos         int         NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- ── 2. VIEW PARA CONSULTA DO RANKING ─────────────────────────

CREATE OR REPLACE VIEW ranking_entries AS
SELECT
  er.id,
  er.tournament_id,
  er.colocacao,
  er.pontos,
  er.parceiro_nome,
  ea.id          AS athlete_id,
  ea.nome,
  ea.instagram,
  ea.genero,
  ea.user_id,
  et.nome_circuito,
  et.tier,
  et.data,
  EXTRACT(YEAR FROM et.data)::int AS ano
FROM external_results er
JOIN external_athletes   ea ON ea.id = er.athlete_id
JOIN external_tournaments et ON et.id = er.tournament_id;

-- ── 3. SEGURANÇA (RLS + GRANTS) ───────────────────────────────

ALTER TABLE external_athletes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_results     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_ext_athletes')    THEN
    CREATE POLICY public_read_ext_athletes    ON external_athletes    FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_ext_tournaments') THEN
    CREATE POLICY public_read_ext_tournaments ON external_tournaments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_ext_results')     THEN
    CREATE POLICY public_read_ext_results     ON external_results     FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON external_athletes, external_tournaments, external_results, ranking_entries
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON external_athletes, external_tournaments, external_results
  TO authenticated;

-- ── 4. ATLETAS MASCULINO ──────────────────────────────────────

INSERT INTO external_athletes (nome, instagram, genero) VALUES
  ('Tavinho',        'tavinhoftv',          'masculino'),
  ('Gui Brasília',   'guidebrasilia',       'masculino'),
  ('Amaury',         'amauryftv',           'masculino'),
  ('Beguinha',       'beguinhaftv',         'masculino'),
  ('Jota Paraná',    'jotaparana',          'masculino'),
  ('Neguebinha',     'neguebinhaftv',       'masculino'),
  ('Sandrey',        'sandreysantos',       'masculino'),
  ('Brisa',          'brisaftv',            'masculino'),
  ('Gui Nascimento', 'gui_nascimento98',    'masculino'),
  ('Zanol',          'zanollucas',          'masculino'),
  ('Hiltinho',       'hiltinhoftv',         'masculino'),
  ('Franklin',       'franklinftv',         'masculino'),
  ('Iago',           'iagoport0',           'masculino'),
  ('Índio',          'indioftv',            'masculino'),
  ('Felipe',         'felipeftv02',         'masculino'),
  ('Nem',            'nem_ftv',             'masculino'),
  ('Vitinho',        'vitinho_ftv03',       'masculino'),
  ('Giovane',        'giovaneftv',          'masculino'),
  ('JoaoET',         'joaoet_ftv',          'masculino'),
  ('Luciano',        'lucianoftv_',         'masculino'),
  ('Juninho RJ',     'juninhodorioftv_',    'masculino'),
  ('Renan Magnago',  'renan_magnago',       'masculino'),
  ('Felipinho',      'felipinhoftv',        'masculino'),
  ('Bruninho',       'bruninhoftv',         'masculino'),
  ('Juninho SC',     'juninho_sc',          'masculino'),
  ('Rafael Longo',   'rafaellongoftv',      'masculino'),
  ('Kibinho',        'kibinhoftv',          'masculino'),
  ('Happ',           'happftv',             'masculino'),
  ('Gabrielzinho',   'gabrielzinhoftv',     'masculino'),
  ('Vinícius',       'viniciusftv',         'masculino'),
  ('Inácio',         'inacio_ftv',          'masculino'),
  ('Tavinho Ba',     'tavinhoba',           'masculino'),
  ('Netinho',        '_netinhoftv_',        'masculino'),
  ('JoaozinBlack',   'joaozinblack',        'masculino'),
  ('Vina',           'vinaftv',             'masculino'),
  ('Lapiseira',      'lapiseiroftv',        'masculino'),
  ('Rato',           'ratoftv',             'masculino'),
  ('Victor Real',    'victorealftv',        'masculino'),
  ('Dudu',           'dudu_ftv',            'masculino'),
  ('Arthur',         'arthur_adao',         'masculino'),
  ('Torres',         '_torresftv',          'masculino'),
  ('Juka',           'jukaftv',             'masculino'),
  ('Landim',         'landimftv',           'masculino'),
  ('Lorim',          'lorimftv',            'masculino'),
  ('Saldanha',       'saldanhaftv',         'masculino'),
  ('João',           'joaoftv7',            'masculino')
ON CONFLICT (instagram) DO NOTHING;

-- ── 5. ATLETAS FEMININO ───────────────────────────────────────

INSERT INTO external_athletes (nome, instagram, genero) VALUES
  ('Lane',       'lanefut',               'feminino'),
  ('Ray',        'rayyftv',               'feminino'),
  ('Josy',       'josyjls',               'feminino'),
  ('Lana',       'lanafutevolei',         'feminino'),
  ('Natália',    'nataliaguitler',        'feminino'),
  ('Vanessa',    'vanessa_tabarez',       'feminino'),
  ('Amanda',     'mandoliveirapersonal',  'feminino'),
  ('Rafaella',   'rafaellafontes2',       'feminino'),
  ('Bianca',     'biancaftv',             'feminino'),
  ('Liz',        'lizftv',                'feminino'),
  ('Tamara',     'tamarachtv',            'feminino'),
  ('Paula',      'paulaftv',              'feminino'),
  ('Emi',        'emilyftv',              'feminino'),
  ('Lissa',      'lissaftv',              'feminino'),
  ('Nila',       'nilaftv',               'feminino'),
  ('Renatinha',  'renatinhaftv',          'feminino'),
  ('Monique',    'moniqueftv',            'feminino'),
  ('Sabrina',    'sabrinaftv',            'feminino'),
  ('Emili',      'emiliricardo',          'feminino'),
  ('Taíssamara', 'taissamara_00',         'feminino'),
  ('Jana',       'janaftv',               'feminino'),
  ('Timi',       'timiftv',               'feminino')
ON CONFLICT (instagram) DO NOTHING;

-- ── 6. TORNEIOS ───────────────────────────────────────────────

INSERT INTO external_tournaments (nome_circuito, tier, data) VALUES
  ('Mikasa Open',                 'nacional', '2020-11-22'),
  ('Mikasa Open',                 'nacional', '2020-12-13'),
  ('Mikasa Open',                 'nacional', '2021-06-27'),
  ('Mikasa Open',                 'nacional', '2021-08-29'),
  ('Mikasa Open',                 'nacional', '2021-11-02'),
  ('Mikasa Open',                 'nacional', '2021-12-13'),
  ('Mikasa Open',                 'nacional', '2022-01-30'),
  ('Mikasa Open',                 'nacional', '2022-03-28'),
  ('Mikasa Open',                 'nacional', '2022-03-30'),
  ('Mikasa Open',                 'nacional', '2022-05-30'),
  ('Mikasa Open',                 'nacional', '2022-05-31'),
  ('Open Nacional de Futevôlei',  'nacional', '2022-10-31'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-01-28'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-01-29'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-04-22'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-06-10'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-09-17'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-10-29'),
  ('Open Nacional de Futevôlei',  'nacional', '2023-11-26'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-01-28'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-03-17'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-10-06'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-10-28'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-11-10'),
  ('Open Nacional de Futevôlei',  'nacional', '2024-12-08'),
  ('Open Nacional de Futevôlei',  'nacional', '2025-03-02'),
  ('Open Nacional de Futevôlei',  'nacional', '2025-06-30'),
  ('Open Nacional de Futevôlei',  'nacional', '2025-09-07'),
  ('Open Nacional de Futevôlei',  'nacional', '2026-03-08'),
  ('Open Nacional de Futevôlei',  'nacional', '2026-05-03')
ON CONFLICT (nome_circuito, data) DO NOTHING;

-- ── 7. RESULTADOS ─────────────────────────────────────────────
-- Padrão: CTE busca o tournament_id, VALUES lista (instagram, colocacao, parceiro, pontos)
-- Nacional: 1º=300pts  2º=180pts  3º=105pts

-- 2020-11-22 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2020-11-22'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('renan_magnago'::text,1::int,'Felipinho'::text,300::int),
          ('felipinhoftv',1,'Renan Magnago',300),
          ('bruninhoftv',2,'Juninho SC',180),
          ('juninho_sc',2,'Bruninho',180),
          ('viniciusftv',3,'Jota Paraná',105),
          ('jotaparana',3,'Vinícius',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2020-12-13 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2020-12-13'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('rafaellongoftv'::text,1::int,'Kibinho'::text,300::int),
          ('kibinhoftv',1,'Rafael Longo',300),
          ('bruninhoftv',2,'Juninho SC',180),
          ('juninho_sc',2,'Bruninho',180),
          ('happftv',3,'Gabrielzinho',105),
          ('gabrielzinhoftv',3,'Happ',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2021-06-27 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2021-06-27'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('hiltinhoftv'::text,1::int,'Franklin'::text,300::int),
          ('franklinftv',1,'Hiltinho',300),
          ('sandreysantos',2,'Brisa',180),
          ('brisaftv',2,'Sandrey',180),
          ('viniciusftv',3,'Jota Paraná',105),
          ('jotaparana',3,'Vinícius',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2021-08-29 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2021-08-29'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('hiltinhoftv'::text,1::int,'Franklin'::text,300::int),
          ('franklinftv',1,'Hiltinho',300),
          ('jotaparana',2,'Tavinho',180),
          ('tavinhoftv',2,'Jota Paraná',180),
          ('juninho_sc',3,'Neguebinha',105),
          ('neguebinhaftv',3,'Juninho SC',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2021-08-29 | Mikasa Open | Feminino (mesma data / mesmo torneio)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2021-08-29'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('josyjls'::text,1::int,'Lana'::text,300::int),
          ('lanafutevolei',1,'Josy',300),
          ('lanefut',2,'Ray',180),
          ('rayyftv',2,'Lane',180),
          ('nataliaguitler',3,'Bianca',105),
          ('biancaftv',3,'Natália',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2021-11-02 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2021-11-02'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('brisaftv'::text,1::int,'Sandrey'::text,300::int),
          ('sandreysantos',1,'Brisa',300),
          ('jotaparana',2,'Tavinho',180),
          ('tavinhoftv',2,'Jota Paraná',180),
          ('juninho_sc',3,'Neguebinha',105),
          ('neguebinhaftv',3,'Juninho SC',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2021-12-13 | Mikasa Open | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2021-12-13'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('lanefut'::text,1::int,'Ray'::text,300::int),
          ('rayyftv',1,'Lane',300),
          ('josyjls',2,'Lana',180),
          ('lanafutevolei',2,'Josy',180),
          ('lizftv',3,'Tamara',105),
          ('tamarachtv',3,'Liz',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-01-30 | Mikasa Open | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-01-30'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('nataliaguitler'::text,1::int,'Vanessa'::text,300::int),
          ('vanessa_tabarez',1,'Natália',300),
          ('rayyftv',2,'Lane',180),
          ('lanefut',2,'Ray',180),
          ('josyjls',3,'Lana',105),
          ('lanafutevolei',3,'Josy',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-01-30 | Mikasa Open | Masculino (mesma data)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-01-30'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('jotaparana'::text,1::int,'Tavinho'::text,300::int),
          ('tavinhoftv',1,'Jota Paraná',300),
          ('brisaftv',2,'Sandrey',180),
          ('sandreysantos',2,'Brisa',180),
          ('juninho_sc',3,'Neguebinha',105),
          ('neguebinhaftv',3,'Juninho SC',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-03-28 | Mikasa Open | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-03-28'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('rayyftv'::text,1::int,'Lane'::text,300::int),
          ('lanefut',1,'Ray',300),
          ('paulaftv',2,'Emi',180),
          ('emilyftv',2,'Paula',180),
          ('lissaftv',3,'Nila',105),
          ('nilaftv',3,'Lissa',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-03-30 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-03-30'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('brisaftv'::text,1::int,'Sandrey'::text,300::int),
          ('sandreysantos',1,'Brisa',300),
          ('neguebinhaftv',2,'Juninho SC',180),
          ('juninho_sc',2,'Neguebinha',180),
          ('juninhodorioftv_',3,'Saldanha',105),
          ('saldanhaftv',3,'Juninho RJ',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-05-30 | Mikasa Open | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-05-30'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('felipinhoftv'::text,1::int,'Neguebinha'::text,300::int),
          ('neguebinhaftv',1,'Felipinho',300),
          ('kibinhoftv',2,'Inácio',180),
          ('inacio_ftv',2,'Kibinho',180),
          ('gui_nascimento98',3,'Zanol',105),
          ('zanollucas',3,'Gui Nascimento',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-05-31 | Mikasa Open | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Mikasa Open' AND data='2022-05-31'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('lanefut'::text,1::int,'Ray'::text,300::int),
          ('rayyftv',1,'Lane',300),
          ('vanessa_tabarez',2,'Amanda',180),
          ('mandoliveirapersonal',2,'Vanessa',180),
          ('janaftv',3,'Timi',105),
          ('timiftv',3,'Jana',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-10-31 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2022-10-31'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Amaury'::text,300::int),
          ('amauryftv',1,'Tavinho',300),
          ('gui_nascimento98',2,'Zanol',180),
          ('zanollucas',2,'Gui Nascimento',180),
          ('neguebinhaftv',3,'Kibinho',105),
          ('kibinhoftv',3,'Neguebinha',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2022-10-31 | Open Nacional | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2022-10-31'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('lanefut'::text,1::int,'Ray'::text,300::int),
          ('rayyftv',1,'Lane',300),
          ('paulaftv',2,'Renatinha',180),
          ('renatinhaftv',2,'Paula',180),
          ('nilaftv',3,'Lissa',105),
          ('lissaftv',3,'Nila',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-01-28 | Open Nacional | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-01-28'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('josyjls'::text,1::int,'Lana'::text,300::int),
          ('lanafutevolei',1,'Josy',300),
          ('lanefut',2,'Emi',180),
          ('emilyftv',2,'Lane',180)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-01-29 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-01-29'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('vinaftv'::text,1::int,'Lapiseira'::text,300::int),
          ('lapiseiroftv',1,'Vina',300),
          ('ratoftv',2,'Amaury',180),
          ('amauryftv',2,'Rato',180)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-04-22 | Open Nacional | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-04-22'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('mandoliveirapersonal'::text,1::int,'Vanessa'::text,300::int),
          ('vanessa_tabarez',1,'Amanda',300),
          ('moniqueftv',2,'Sabrina',180),
          ('sabrinaftv',2,'Monique',180),
          ('rayyftv',3,'Lane',105),
          ('lanefut',3,'Ray',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-04-22 | Open Nacional | Masculino (mesma data)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-04-22'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('amauryftv'::text,1::int,'Tavinho'::text,300::int),
          ('tavinhoftv',1,'Amaury',300),
          ('indioftv',2,'Felipe',180),
          ('felipeftv02',2,'Índio',180),
          ('_netinhoftv_',3,'JoaozinBlack',105),
          ('joaozinblack',3,'Netinho',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-06-10 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-06-10'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('beguinhaftv'::text,1::int,'JoaoET'::text,300::int),
          ('joaoet_ftv',1,'Beguinha',300),
          ('amauryftv',2,'Tavinho',180),
          ('tavinhoftv',2,'Amaury',180),
          ('indioftv',3,'Felipe',105),
          ('felipeftv02',3,'Índio',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-09-17 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-09-17'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('guidebrasilia'::text,1::int,'Tavinho'::text,300::int),
          ('tavinhoftv',1,'Gui Brasília',300),
          ('lucianoftv_',2,'Juninho RJ',180),
          ('juninhodorioftv_',2,'Luciano',180),
          ('jotaparana',3,'Nem',105),
          ('nem_ftv',3,'Jota Paraná',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-09-17 | Open Nacional | Feminino (mesma data)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-09-17'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('josyjls'::text,1::int,'Lana'::text,300::int),
          ('lanafutevolei',1,'Josy',300),
          ('lanefut',2,'Ray',180),
          ('rayyftv',2,'Lane',180),
          ('emiliricardo',3,'Taíssamara',105),
          ('taissamara_00',3,'Emili',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-10-29 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-10-29'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('jotaparana'::text,1::int,'Vitinho'::text,300::int),
          ('vitinho_ftv03',1,'Jota Paraná',300),
          ('tavinhoftv',2,'Beguinha',180),
          ('beguinhaftv',2,'Tavinho',180),
          ('zanollucas',3,'Gui Nascimento',105),
          ('gui_nascimento98',3,'Zanol',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-11-26 | Open Nacional | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-11-26'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('rayyftv'::text,1::int,'Lane'::text,300::int),
          ('lanefut',1,'Ray',300),
          ('josyjls',2,'Lana',180),
          ('lanafutevolei',2,'Josy',180),
          ('vanessa_tabarez',3,'Amanda',105),
          ('mandoliveirapersonal',3,'Vanessa',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2023-11-26 | Open Nacional | Masculino (mesma data)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2023-11-26'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('jotaparana',2,'Vitinho',180),
          ('vitinho_ftv03',2,'Jota Paraná',180),
          ('amauryftv',3,'João',105),
          ('joaoftv7',3,'Amaury',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-01-28 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-01-28'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('beguinhaftv'::text,1::int,'Giovane'::text,300::int),
          ('giovaneftv',1,'Beguinha',300),
          ('amauryftv',2,'Nem',180),
          ('nem_ftv',2,'Amaury',180)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-03-17 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-03-17'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('jotaparana',2,'Vitinho',180),
          ('vitinho_ftv03',2,'Jota Paraná',180),
          ('amauryftv',3,'Nem',105),
          ('nem_ftv',3,'Amaury',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-10-06 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-10-06'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('beguinhaftv',2,'Giovane',180),
          ('giovaneftv',2,'Beguinha',180),
          ('neguebinhaftv',3,'Gui Nascimento',105),
          ('gui_nascimento98',3,'Neguebinha',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-10-28 | Open Nacional | Feminino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-10-28'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('nataliaguitler'::text,1::int,'Vanessa'::text,300::int),
          ('vanessa_tabarez',1,'Natália',300),
          ('mandoliveirapersonal',2,'Rafaella',180),
          ('rafaellafontes2',2,'Amanda',180),
          ('rayyftv',3,'Lane',105),
          ('lanefut',3,'Ray',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-11-10 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-11-10'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('tavinhoba',2,'Netinho',180),
          ('_netinhoftv_',2,'Tavinho Ba',180),
          ('landimftv',3,'Lorim',105),
          ('lorimftv',3,'Landim',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2024-12-08 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2024-12-08'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('gui_nascimento98'::text,1::int,'Neguebinha'::text,300::int),
          ('neguebinhaftv',1,'Gui Nascimento',300),
          ('_torresftv',2,'Juka',180),
          ('jukaftv',2,'Torres',180),
          ('_netinhoftv_',3,'Tavinho Ba',105),
          ('tavinhoba',3,'Netinho',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2025-03-02 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2025-03-02'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('iagoport0'::text,1::int,'Beguinha'::text,300::int),
          ('beguinhaftv',1,'Iago',300),
          ('indioftv',2,'Felipe',180),
          ('felipeftv02',2,'Índio',180),
          ('tavinhoftv',3,'Gui Brasília',105),
          ('guidebrasilia',3,'Tavinho',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2025-06-30 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2025-06-30'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('iagoport0',2,'Beguinha',180),
          ('beguinhaftv',2,'Iago',180),
          ('dudu_ftv',3,'Arthur',105),
          ('arthur_adao',3,'Dudu',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2025-09-07 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2025-09-07'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('guidebrasilia'::text,1::int,'Tavinho'::text,300::int),
          ('tavinhoftv',1,'Gui Brasília',300),
          ('franklinftv',2,'Victor Real',180),
          ('victorealftv',2,'Franklin',180),
          ('indioftv',3,'Felipe',105),
          ('felipeftv02',3,'Índio',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2026-03-08 | Open Nacional | Masculino
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2026-03-08'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300),
          ('indioftv',2,'Felipe',180),
          ('felipeftv02',2,'Índio',180),
          ('amauryftv',3,'Tavinho Ba',105),
          ('tavinhoba',3,'Amaury',105)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- 2026-05-03 | Open Nacional | Masculino (só 1º lugar disponível)
WITH t AS (SELECT id FROM external_tournaments WHERE nome_circuito='Open Nacional de Futevôlei' AND data='2026-05-03'),
rows AS (SELECT a.id aid, v.col, v.par, v.pts FROM
  (VALUES ('tavinhoftv'::text,1::int,'Gui Brasília'::text,300::int),
          ('guidebrasilia',1,'Tavinho',300)
  ) AS v(ig,col,par,pts) JOIN external_athletes a ON a.instagram=v.ig)
INSERT INTO external_results (tournament_id,athlete_id,colocacao,parceiro_nome,pontos)
SELECT t.id,r.aid,r.col,r.par,r.pts FROM t,rows r;

-- ── FIM ──────────────────────────────────────────────────────
-- Verifique com:
-- SELECT genero, SUM(pontos) total, COUNT(*) resultados FROM ranking_entries GROUP BY genero;
