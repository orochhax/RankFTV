-- Coluna para foto de perfil da página
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Bucket público para imagens de páginas
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-images', 'page-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer autenticado pode fazer upload na própria pasta
CREATE POLICY "page-images upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'page-images');

CREATE POLICY "page-images update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'page-images');

CREATE POLICY "page-images public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'page-images');

CREATE POLICY "page-images delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'page-images');
