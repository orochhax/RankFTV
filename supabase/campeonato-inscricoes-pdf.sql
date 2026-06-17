-- Datas de inscrições + URL do PDF do regulamento.
-- Rodar no Supabase SQL Editor.

ALTER TABLE championships
  ADD COLUMN IF NOT EXISTS inscricoes_inicio    date,
  ADD COLUMN IF NOT EXISTS inscricoes_fim       date,
  ADD COLUMN IF NOT EXISTS regulamento_pdf_url  text;

-- Bucket público para regulamentos em PDF.
-- Se preferir criar pelo Dashboard: Storage → New bucket → "regulamentos" → Public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('regulamentos', 'regulamentos', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode fazer upload; todos podem ler.
DROP POLICY IF EXISTS regulamentos_upload ON storage.objects;
CREATE POLICY regulamentos_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'regulamentos');

DROP POLICY IF EXISTS regulamentos_read ON storage.objects;
CREATE POLICY regulamentos_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'regulamentos');
