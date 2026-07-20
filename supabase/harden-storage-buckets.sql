-- =============================================================
-- RANKFTV — Hardening final de storage: bucket noticias (upload aberto pra
-- qualquer authenticated) e bucket avatars (nunca teve definição em SQL —
-- criado fora de banda, sem policy rastreada no repositório).
--
-- ATENÇÃO avatars: como o bucket foi criado fora de qualquer migration
-- (components/perfil/EditProfileForm.tsx já assume que ele existe), pode
-- já ter policies manuais no painel do Supabase mais permissivas que as
-- definidas aqui. Esta migration cria o bucket se não existir e garante
-- QUE policies com os nomes abaixo existam corretas — mas não consegue
-- saber nem remover policies manuais com outro nome. Confira no painel
-- Storage → avatars → Policies depois de rodar, e apague qualquer policy
-- antiga que não seja uma das criadas aqui.
--
-- Idempotente — pode rodar mais de uma vez.
-- =============================================================

-- ── noticias: só admin/ceo escreve (a tabela news já era admin-only via
-- service_role; o bucket de imagem tinha ficado aberto pra qualquer
-- authenticated por engano em add-news.sql) ────────────────────────────
DROP POLICY IF EXISTS "noticias_auth_write" ON storage.objects;
DROP POLICY IF EXISTS noticias_admin_insert ON storage.objects;
DROP POLICY IF EXISTS noticias_admin_update ON storage.objects;
DROP POLICY IF EXISTS noticias_admin_delete ON storage.objects;

CREATE POLICY noticias_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'noticias'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'ceo'))
  );
CREATE POLICY noticias_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'noticias'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'ceo'))
  );
CREATE POLICY noticias_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'noticias'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'ceo'))
  );

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'noticias';

-- ── avatars: cria (se preciso) e trava por dono, igual page-images ──────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
DROP POLICY IF EXISTS avatars_public_read  ON storage.objects;

CREATE POLICY avatars_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'avatars';

-- ── arenas: já tinha policy correta (fix-arenas-storage-policies.sql,
-- owner-scoped por dono_id) — só faltava limite de tamanho/MIME, igual aos
-- outros buckets de imagem.
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'arenas';

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'harden-storage-buckets done';
