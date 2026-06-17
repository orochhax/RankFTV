-- 10 campeonatos fake para teste do painel.
-- Rodar no Supabase SQL Editor.

DO $$
DECLARE
  v_user_id uuid;
  v_id      uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'carlosrocha0923@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- 1
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'RochaCup 2025', 'Edição anterior do RochaCup.', '', '2025-08-10', '2025-08-11', 'Eunápolis', 'BA', 'Arena Beach', 'encerrado')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Iniciante', 'masculino', 12000, 0, 999), (v_id, 'Amador', 'masculino', 16000, 1000, 2999);

  -- 2
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'RochaCup 2024', 'Primeira edição do RochaCup.', '', '2024-07-20', '2024-07-21', 'Eunápolis', 'BA', 'Arena Beach', 'encerrado')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Iniciante', 'masculino', 10000, 0, 999);

  -- 3
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Copa Litoral BA', 'Circuito do litoral baiano.', '', '2026-08-05', '2026-08-06', 'Porto Seguro', 'BA', 'Praia de Taperapuã', 'inscricoes_abertas')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Iniciante', 'masculino', 14000, 0, 999), (v_id, 'Intermediário', 'masculino', 18000, 1000, 1999), (v_id, 'Iniciante', 'feminino', 12000, 0, 999);

  -- 4
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Copa Litoral BA 2025', 'Edição 2025.', '', '2025-09-13', '2025-09-14', 'Porto Seguro', 'BA', 'Praia de Taperapuã', 'encerrado')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Amador', 'masculino', 15000, 0, 2999);

  -- 5
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Torneio Verão Bahia', 'O maior torneio de verão do sul da Bahia.', '', '2026-01-18', '2026-01-19', 'Ilhéus', 'BA', 'Praia do Malhado', 'encerrado')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Iniciante', 'masculino', 13000, 0, 999), (v_id, 'Intermediário', 'feminino', 13000, 0, 1999);

  -- 6
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Torneio Verão Bahia 2027', 'Edição 2027 — em planejamento.', '', '2027-01-17', '2027-01-18', 'Ilhéus', 'BA', 'Praia do Malhado', 'rascunho')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Iniciante', 'masculino', 15000, 0, 999);

  -- 7
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Open Eunápolis', 'Torneio aberto da cidade.', '', '2026-09-20', '2026-09-21', 'Eunápolis', 'BA', 'Praça da Liberdade', 'rascunho')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Qualify', 'masculino', 20000, 2000, 9999), (v_id, 'Qualify', 'feminino', 20000, 2000, 9999);

  -- 8
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Festival Beach Sul BA', 'Festival multi-esportes com etapa de futevôlei.', '', '2026-10-10', '2026-10-12', 'Teixeira de Freitas', 'BA', 'Arena Sul', 'inscricoes_abertas')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Aprendiz', 'masculino', 8000, 0, 499), (v_id, 'Iniciante', 'masculino', 12000, 500, 999), (v_id, 'Aprendiz', 'feminino', 8000, 0, 499);

  -- 9
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Desafio das Praias', 'Circuito itinerante pelas praias do extremo sul.', '', '2026-11-08', '2026-11-09', 'Caraíva', 'BA', 'Praia de Caraíva', 'inscricoes_abertas')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Intermediário', 'masculino', 17000, 1000, 1999), (v_id, 'Amador', 'masculino', 22000, 2000, 2999);

  -- 10
  INSERT INTO championships (organizador_id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status)
  VALUES (v_user_id, 'Grand Slam Bahia', 'O maior evento de futevôlei do estado.', '', '2026-12-05', '2026-12-07', 'Salvador', 'BA', 'Praia de Stella Maris', 'rascunho')
  RETURNING id INTO v_id;
  INSERT INTO championship_categories (championship_id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max)
  VALUES (v_id, 'Profissional', 'masculino', 35000, 3000, 9999), (v_id, 'Profissional', 'feminino', 35000, 3000, 9999), (v_id, 'Amador', 'masculino', 22000, 2000, 2999);

  RAISE NOTICE 'Campeonatos fake criados com sucesso!';
END;
$$;
