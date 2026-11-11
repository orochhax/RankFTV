-- ==============================================================================
-- Migration: add-championship-expenses.sql
-- Tabela de despesas operacionais do campeonato com categorização livre,
-- controle de vencimento/pagamento e RLS estrito para organizadores.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.championship_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  organizador_id uuid NOT NULL,
  categoria text NOT NULL,
  nome text NOT NULL,
  valor numeric(10, 2) NOT NULL CHECK (valor > 0),
  status text NOT NULL CHECK (status IN ('pendente', 'pago')) DEFAULT 'pendente',
  data_vencimento date NOT NULL,
  data_pagamento timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices operacionais para performance nas consultas do painel
CREATE INDEX IF NOT EXISTS idx_championship_expenses_champ 
  ON public.championship_expenses (championship_id, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_championship_expenses_org 
  ON public.championship_expenses (organizador_id, status);

-- Habilita Row Level Security
ALTER TABLE public.championship_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: apenas o organizador dono do campeonato pode ver, criar, editar e excluir
DROP POLICY IF EXISTS championship_expenses_select ON public.championship_expenses;
CREATE POLICY championship_expenses_select ON public.championship_expenses
  FOR SELECT TO authenticated
  USING (
    organizador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.championships WHERE id = championship_id AND organizador_id = auth.uid())
  );

DROP POLICY IF EXISTS championship_expenses_insert ON public.championship_expenses;
CREATE POLICY championship_expenses_insert ON public.championship_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    organizador_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.championships WHERE id = championship_id AND organizador_id = auth.uid())
  );

DROP POLICY IF EXISTS championship_expenses_update ON public.championship_expenses;
CREATE POLICY championship_expenses_update ON public.championship_expenses
  FOR UPDATE TO authenticated
  USING (
    organizador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.championships WHERE id = championship_id AND organizador_id = auth.uid())
  )
  WITH CHECK (
    organizador_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.championships WHERE id = championship_id AND organizador_id = auth.uid())
  );

DROP POLICY IF EXISTS championship_expenses_delete ON public.championship_expenses;
CREATE POLICY championship_expenses_delete ON public.championship_expenses
  FOR DELETE TO authenticated
  USING (
    organizador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.championships WHERE id = championship_id AND organizador_id = auth.uid())
  );

-- Concede privilégios aos papéis da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON public.championship_expenses TO authenticated;
GRANT ALL ON public.championship_expenses TO service_role;
