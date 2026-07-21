-- =============================================================
-- RANKFTV — valida ordem cronológica das datas do campeonato no banco
-- (defesa em profundidade: cliente e servidor já validam em
-- app/painel/novo-campeonato/actions.ts e
-- app/painel/campeonatos/[id]/editar/actions.ts, mas isso não cobre uma
-- escrita direta no banco, ex: script, migração de dados, admin SQL).
--
-- Idempotente — seguro rodar de novo. Não força inscricoes_inicio/fim a
-- NOT NULL: campeonatos antigos podem ter esses campos nulos (a regra de
-- obrigatoriedade é nova, só vale pra campeonatos criados/editados a
-- partir de agora pelo app) — uma constraint NOT NULL aqui quebraria
-- linhas existentes sem um backfill decidido por quem opera o produto.
-- Execute no SQL Editor do Supabase.
-- =============================================================

DO $$
DECLARE
  v_bad_evento     integer;
  v_bad_inscricoes integer;
  v_bad_prevenda   integer;
BEGIN
  SELECT count(*) INTO v_bad_evento
    FROM championships
    WHERE data_fim < data_inicio;

  SELECT count(*) INTO v_bad_inscricoes
    FROM championships
    WHERE inscricoes_inicio IS NOT NULL
      AND inscricoes_fim IS NOT NULL
      AND inscricoes_fim < inscricoes_inicio;

  SELECT count(*) INTO v_bad_prevenda
    FROM championships
    WHERE prevenda_inicio IS NOT NULL
      AND prevenda_fim IS NOT NULL
      AND prevenda_fim < prevenda_inicio;

  IF v_bad_evento > 0 OR v_bad_inscricoes > 0 OR v_bad_prevenda > 0 THEN
    RAISE NOTICE 'ATENÇÃO: % campeonato(s) com fim de evento antes do início, % com fim de inscrições antes da abertura, % com fim de pré-venda antes do início. As constraints abaixo entram NOT VALID — corrija essas linhas antes de rodar os VALIDATE CONSTRAINT no final deste arquivo.', v_bad_evento, v_bad_inscricoes, v_bad_prevenda;
  ELSE
    RAISE NOTICE 'OK: nenhuma linha de championships com datas fora de ordem.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'championships_evento_ordem_chk'
  ) THEN
    ALTER TABLE championships
      ADD CONSTRAINT championships_evento_ordem_chk
      CHECK (data_fim >= data_inicio)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'championships_inscricoes_ordem_chk'
  ) THEN
    ALTER TABLE championships
      ADD CONSTRAINT championships_inscricoes_ordem_chk
      CHECK (inscricoes_inicio IS NULL OR inscricoes_fim IS NULL OR inscricoes_fim >= inscricoes_inicio)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'championships_prevenda_ordem_chk'
  ) THEN
    ALTER TABLE championships
      ADD CONSTRAINT championships_prevenda_ordem_chk
      CHECK (prevenda_inicio IS NULL OR prevenda_fim IS NULL OR prevenda_fim >= prevenda_inicio)
      NOT VALID;
  END IF;
END $$;

-- Só depois de conferir a mensagem "OK" acima (ou corrigir as linhas
-- ruins), rode manualmente pra travar de vez (faz um scan da tabela,
-- por isso não roda automático aqui):
--   ALTER TABLE championships VALIDATE CONSTRAINT championships_evento_ordem_chk;
--   ALTER TABLE championships VALIDATE CONSTRAINT championships_inscricoes_ordem_chk;
--   ALTER TABLE championships VALIDATE CONSTRAINT championships_prevenda_ordem_chk;

NOTIFY pgrst, 'reload schema';

NOTIFY migrations, 'harden-championship-dates-chronology done';
