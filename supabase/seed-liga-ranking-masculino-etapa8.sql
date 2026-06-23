-- Ranking da Liga Brasileira de Futevôlei — MASCULINO
-- Atualização: após a finalização da 8ª etapa (Brasil Open de Futevôlei).
-- O snapshot anterior (54ª etapa Team Águia, 17/06/2026) fica registrado em
-- seed-liga-ranking-2026.sql — não apague, é o histórico pra restaurar depois.
--
-- Só mexe no MASCULINO (DELETE … WHERE genero='masculino'); o feminino fica
-- intacto. Executa no Supabase SQL Editor.

-- ── Colunas de posição (idempotente) ───────────────────────────────────────
-- posicao          = posição oficial atual (vem da tabela oficial, não calculada)
-- posicao_anterior = posição na atualização passada (NULL = entrou agora)
-- A página usa as duas pra mostrar a setinha de subiu/desceu/igual.
ALTER TABLE ranking_individual ADD COLUMN IF NOT EXISTS posicao          INTEGER;
ALTER TABLE ranking_individual ADD COLUMN IF NOT EXISTS posicao_anterior INTEGER;
ALTER TABLE ranking_dupla      ADD COLUMN IF NOT EXISTS posicao          INTEGER;
ALTER TABLE ranking_dupla      ADD COLUMN IF NOT EXISTS posicao_anterior INTEGER;

-- ── Limpa só o masculino ────────────────────────────────────────────────────
DELETE FROM ranking_individual WHERE genero = 'masculino';
DELETE FROM ranking_dupla      WHERE genero = 'masculino';

-- ────────────────────────────────────────────────
-- RANKING INDIVIDUAL MASCULINO (8ª etapa / Brasil Open)
-- (nome, genero, pontos, posicao, posicao_anterior)
-- ────────────────────────────────────────────────
INSERT INTO ranking_individual (nome, genero, pontos, posicao, posicao_anterior) VALUES
  ('Índio',          'masculino', 7400,  1,  1),
  ('Felipe',         'masculino', 7400,  2,  2),
  ('Tavinho',        'masculino', 3810,  3,  3),
  ('Gui',            'masculino', 3810,  4,  4),
  ('Dudu',           'masculino', 2800,  5,  5),
  ('Arthur',         'masculino', 2800,  6,  6),
  ('Sandrey',        'masculino', 2570,  7,  7),
  ('Michel',         'masculino', 2570,  8,  8),
  ('Beguinha',       'masculino', 2370,  9,  9),
  ('Giovane',        'masculino', 1580, 10, 10),
  ('Brisa',          'masculino', 1520, 11, 11),
  ('Davi',           'masculino', 1280, 12, 12),
  ('Marcola',        'masculino', 1210, 13, 13),
  ('Pedrinho',       'masculino', 1020, 14, 14),
  ('Vitinho',        'masculino',  940, 15, 17),
  ('Murilo',         'masculino',  860, 16, 15),
  ('Preto Mágico',   'masculino',  850, 17, 16),
  ('Rafa Longo',     'masculino',  730, 18, 18),
  ('Iago',           'masculino',  700, 19, NULL),
  ('Tavinho/BA',     'masculino',  620, 20, 19),
  ('Amaury',         'masculino',  620, 21, 20),
  ('Paulinho',       'masculino',  510, 22, 21),
  ('Matteus',        'masculino',  510, 23, 22),
  ('Fernando',       'masculino',  470, 24, 23),
  ('Juka',           'masculino',  420, 25, 41),
  ('Bryan',          'masculino',  410, 26, 55),
  ('Franklin',       'masculino',  350, 27, 24),
  ('Biel',           'masculino',  330, 28, 25),
  ('Paraná',         'masculino',  320, 29, 27),
  ('Thierry',        'masculino',  310, 30, 26),
  ('Neguebinha',     'masculino',  220, 31, 28),
  ('Felipe Isse',    'masculino',  200, 32, 29),
  ('Joãozinho',      'masculino',  200, 33, 30),
  ('Torres',         'masculino',  200, 34, NULL),
  ('Kuka',           'masculino',  200, 35, NULL),
  ('Edson Jr.',      'masculino',  120, 36, 31),
  ('Dudu Andrade',   'masculino',   50, 37, 32),
  ('Leo Bulks',      'masculino',   50, 38, NULL),
  ('Dudu Stork',     'masculino',   50, 39, NULL),
  ('Pablo',          'masculino',   40, 40, 33),
  ('VT',             'masculino',   30, 41, 34),
  ('Maestro',        'masculino',   30, 42, 35),
  ('Renan Magnano',  'masculino',   30, 43, 36),
  ('Gui Nascimento', 'masculino',   30, 44, 39),
  ('Felipe Messias', 'masculino',   30, 45, 40),
  ('Borges',         'masculino',   20, 46, 37),
  ('Lucas Assis',    'masculino',   20, 47, 38),
  ('Rhuan',          'masculino',   20, 48, 61),
  ('Netinho',        'masculino',   10, 49, 42),
  ('Bruninho GO',    'masculino',   10, 50, 43),
  ('Victor Real',    'masculino',   10, 51, 44),
  ('Saldanha',       'masculino',   10, 52, 45),
  ('Gui',            'masculino',   10, 53, 46),
  ('Renan Billy',    'masculino',   10, 54, 47),
  ('Matheusinho',    'masculino',   10, 55, 48),
  ('Iuri',           'masculino',   10, 56, 49),
  ('Muniz',          'masculino',   10, 57, 50),
  ('Vina',           'masculino',   10, 58, 51),
  ('Juan Tubarão',   'masculino',   10, 59, 52),
  ('Bernardo Bulks', 'masculino',   10, 60, 53),
  ('Scarpelli',      'masculino',   10, 61, 54),
  ('Bruno Barros',   'masculino',   10, 62, 56),
  ('Suylan',         'masculino',   10, 63, 57),
  ('Eduzinho',       'masculino',   10, 64, 58),
  ('Neguinho',       'masculino',   10, 65, 59),
  ('Pedrinho/MT',    'masculino',   10, 66, 60),
  ('Sergyn',         'masculino',   10, 67, 62),
  ('Cassiano',       'masculino',   10, 68, 63),
  ('Savio',          'masculino',   10, 69, 64),
  ('Avatar',         'masculino',   10, 70, 65),
  ('Heytor',         'masculino',   10, 71, 66),
  ('Denner',         'masculino',   10, 72, 67),
  ('Hiltinho',       'masculino',   10, 73, 68),
  ('Nycolas',        'masculino',   10, 74, NULL),
  ('Landim',         'masculino',   10, 75, NULL);

-- ────────────────────────────────────────────────
-- RANKING DUPLAS MASCULINO (8ª etapa / Brasil Open)
-- (atleta1, atleta2, genero, pontos, posicao, posicao_anterior)
-- ────────────────────────────────────────────────
INSERT INTO ranking_dupla (atleta1, atleta2, genero, pontos, posicao, posicao_anterior) VALUES
  ('Índio',      'Felipe',       'masculino', 14800,  1,  1),
  ('Tavinho',    'Gui',          'masculino',  7620,  2,  2),
  ('Dudu',       'Arthur',       'masculino',  5600,  3,  3),
  ('Sandrey',    'Michel',       'masculino',  5140,  4,  4),
  ('Beguinha',   'Iago Porto',   'masculino',  3070,  5,  NULL),
  ('Brisa',      'Marcola',      'masculino',  2730,  6,  6),
  ('Davi',       'Pedrinho',     'masculino',  2300,  7,  7),
  ('Murilo',     'Preto Mágico', 'masculino',  1710,  8,  8),
  ('Vitinho',    'Longo',        'masculino',  1670,  9,  9),
  ('Giovane',    'Amaury Feijó', 'masculino',  1580, 10,  NULL),
  ('Tavinho/BA', 'Amaury',       'masculino',  1240, 11, 10),
  ('Paulinho',   'Matteus',      'masculino',  1020, 12, 11);
