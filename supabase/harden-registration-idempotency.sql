-- =============================================================
-- RANKFTV — Hardening: evita inscrição/cobrança duplicada em campeonato por
-- clique duplo ou retry de rede.
--
-- app/campeonatos/[id]/inscrever/actions.ts checava "já está inscrito?" com
-- um SELECT antes de criar a dupla — clássica corrida TOCTOU: dois cliques
-- rápidos (ou um retry de rede depois de um timeout em que a primeira
-- tentativa já tinha sucedido no servidor) podiam passar os dois pelo
-- SELECT antes de qualquer um terminar o INSERT, criando duas duplas e duas
-- cobranças no Asaas pra mesma pessoa no mesmo campeonato.
--
-- Um índice único parcial fecha a corrida no nível do banco (a segunda
-- tentativa concorrente falha no INSERT com unique_violation, ANTES de
-- qualquer chamada ao Asaas) — mais simples e mais confiável que tentar
-- coordenar idempotência só em TypeScript, já que a Asaas não oferece
-- cabeçalho Idempotency-Key nativo em POST /payments (confirmado via
-- docs.asaas.com — só documentam idempotência do lado do consumo de
-- webhook, não de criação de cobrança).
--
-- Cobre o atleta1 (quem de fato submete e paga a inscrição). O caso de um
-- mesmo atleta ser convidado duas vezes como atleta2 continua coberto só
-- pelo SELECT em TypeScript (risco de dado duplicado, não de cobrança
-- duplicada — atleta2 nunca aciona o pagamento).
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

DO $$
DECLARE
  v_dup int;
BEGIN
  SELECT count(*) INTO v_dup FROM (
    SELECT championship_id, atleta1_id
    FROM teams
    WHERE status <> 'cancelado'
    GROUP BY championship_id, atleta1_id
    HAVING count(*) > 1
  ) x;
  IF v_dup > 0 THEN
    RAISE NOTICE 'ATENÇÃO: % combinação(ões) de championship_id+atleta1_id já têm mais de uma dupla ativa. O índice único abaixo vai falhar até isso ser resolvido manualmente (cancelar a dupla extra).', v_dup;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teams_one_active_per_atleta1
  ON teams (championship_id, atleta1_id)
  WHERE status <> 'cancelado';

-- ── Aluguel de quadra: mesmo problema, outro recurso ────────────────────
-- arena_rentals é slot fixo (arena_id + data + hora, sem duração variável) —
-- nada impedia dois clientes (ou um clique duplo do mesmo cliente)
-- reservarem o mesmo horário simultaneamente; os dois passavam pela
-- checagem de disponibilidade em TypeScript antes de qualquer um COMMITar
-- o INSERT. Índice único fecha a corrida no banco.
DO $$
DECLARE
  v_dup int;
BEGIN
  SELECT count(*) INTO v_dup FROM (
    SELECT arena_id, data, hora
    FROM arena_rentals
    WHERE status_pagamento NOT IN ('cancelado', 'estornado')
    GROUP BY arena_id, data, hora
    HAVING count(*) > 1
  ) x;
  IF v_dup > 0 THEN
    RAISE NOTICE 'ATENÇÃO: % horário(s) de aluguel já têm mais de uma reserva ativa. Resolva manualmente antes do índice único pegar.', v_dup;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS arena_rentals_one_active_per_slot
  ON arena_rentals (arena_id, data, hora)
  WHERE status_pagamento NOT IN ('cancelado', 'estornado');

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-registration-idempotency done';
