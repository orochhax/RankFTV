-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting para endpoints públicos (ex.: consulta de ingressos por CPF+email).
-- Guarda um contador por chave (ex.: "ingressos:<ip>") numa janela deslizante.
-- A função é atômica (um único UPSERT), então funciona mesmo com várias instâncias
-- serverless rodando em paralelo na Vercel.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  hits         int         NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Só o service_role (server) toca nessa tabela. anon/authenticated não têm acesso.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- check_rate_limit: incrementa o contador da chave e devolve TRUE se ainda está
-- dentro do limite (allowed) ou FALSE se estourou. Reinicia a janela quando ela
-- expira. security definer pra rodar com privilégio da função, ignorando RLS.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key            text,
  p_max            int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits int;
BEGIN
  INSERT INTO rate_limits AS rl (key, hits, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE
    SET hits = CASE
                 WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
                 THEN 1
                 ELSE rl.hits + 1
               END,
        window_start = CASE
                 WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
                 THEN now()
                 ELSE rl.window_start
               END
  RETURNING rl.hits INTO v_hits;

  RETURN v_hits <= p_max;
END;
$$;

-- Só o server (service_role) chama essa função.
REVOKE ALL ON FUNCTION check_rate_limit(text, int, int) FROM public;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO service_role;

-- Limpeza opcional: linhas antigas podem ser removidas periodicamente.
-- (Não é obrigatório — a janela é sempre recalculada na leitura.)
