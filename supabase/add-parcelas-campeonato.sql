-- Adiciona colunas de parcelamento máximo por campeonato.
-- max_parcelas_inscricao → inscrições de atletas
-- max_parcelas_ingresso  → ingressos de plateia
-- Padrão 1 = só à vista. Rode no SQL Editor do Supabase.

ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS max_parcelas_inscricao int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_parcelas_ingresso  int NOT NULL DEFAULT 1;

NOTIFY pgrst, 'reload schema';
