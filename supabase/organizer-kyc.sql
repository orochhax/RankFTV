-- =============================================================
-- RANKFTV — KYC & Verificação Antifraude de Organizadores
-- Executável no Supabase SQL Editor (idempotente).
--
-- 1. organizer_accounts:
--    - nome_completo: nome oficial do documento.
--    - documento_tipo: 'cnh' ou 'rg'.
--    - documento_numero: número do RG ou CNH.
--    - documento_frente_url: caminho do arquivo no Supabase Storage.
--    - documento_verso_url: caminho do arquivo no Supabase Storage.
--    - selfie_url: selfie segurando o documento ao lado do rosto.
--    - status_verificacao: 'pendente_documentos' | 'em_analise' | 'aprovado' | 'rejeitado'.
--    - motivo_rejeicao: texto do motivo da recusa (quando rejeitado).
--    - submetido_em: quando o organizador enviou para análise.
--    - aprovado_por: ID do usuário CEO que aprovou.
--    - aprovado_em: data e hora da aprovação.
--
-- 2. Storage Bucket:
--    - 'organizer-kyc' (privado).
--    - RLS: upload do próprio usuário; leitura pelo dono ou CEO/service_role.
-- =============================================================

ALTER TABLE organizer_accounts
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS documento_tipo text,
  ADD COLUMN IF NOT EXISTS documento_numero text,
  ADD COLUMN IF NOT EXISTS documento_frente_url text,
  ADD COLUMN IF NOT EXISTS documento_verso_url text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS status_verificacao text NOT NULL DEFAULT 'pendente_documentos',
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS submetido_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- Constraint de status
ALTER TABLE organizer_accounts
  DROP CONSTRAINT IF EXISTS organizer_accounts_status_verificacao_check;

ALTER TABLE organizer_accounts
  ADD CONSTRAINT organizer_accounts_status_verificacao_check
  CHECK (status_verificacao IN ('pendente_documentos', 'em_analise', 'aprovado', 'rejeitado'));

-- Migração das contas já habilitadas (ex: CEO) para 'aprovado'
UPDATE organizer_accounts
SET status_verificacao = 'aprovado'
WHERE habilitado = true AND status_verificacao = 'pendente_documentos';

-- Bucket privado no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organizer-kyc',
  'organizer-kyc',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Políticas de acesso ao bucket organizer-kyc
DROP POLICY IF EXISTS "organizer_kyc_owner_upload" ON storage.objects;
CREATE POLICY "organizer_kyc_owner_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organizer-kyc'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "organizer_kyc_owner_select" ON storage.objects;
CREATE POLICY "organizer_kyc_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organizer-kyc'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ceo', 'admin')
    )
  )
);
