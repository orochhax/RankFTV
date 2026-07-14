-- =============================================================
-- RankFTV - hardening obrigatorio antes da producao
-- ETAPA 1: execute no Supabase SQL Editor ANTES do deploy do codigo novo.
-- Depois do deploy ficar Ready, execute production-security-hardening-after-deploy.sql.
-- O script e idempotente sempre que possivel.
-- =============================================================

-- 1) Dados pessoais nao pertencem ao perfil publico.
ALTER TABLE profiles_private
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS questionario jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'data_nascimento'
  ) THEN
    INSERT INTO profiles_private (user_id, data_nascimento)
    SELECT id, data_nascimento FROM profiles WHERE data_nascimento IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
      SET data_nascimento = COALESCE(EXCLUDED.data_nascimento, profiles_private.data_nascimento);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'questionario'
  ) THEN
    INSERT INTO profiles_private (user_id, questionario)
    SELECT id, questionario FROM profiles WHERE questionario IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
      SET questionario = COALESCE(EXCLUDED.questionario, profiles_private.questionario);
  END IF;
END $$;

-- Role e rating afetam autorizacao/ranking e nunca podem ser escolhidos pelo
-- proprio usuario via REST. As Actions autorizadas usam service_role.
CREATE OR REPLACE FUNCTION protect_profile_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.rating IS DISTINCT FROM OLD.rating) THEN
    RAISE EXCEPTION 'Campos de sistema do perfil nao podem ser alterados pelo cliente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON profiles;
DROP TRIGGER IF EXISTS profile_system_fields_guard ON profiles;
CREATE TRIGGER profile_system_fields_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_system_fields();

-- 2) Um membro da equipe so pode responder ao convite. Permissoes continuam
-- sendo alteraveis apenas pelo organizador ou pelo service_role.
CREATE OR REPLACE FUNCTION protect_championship_staff_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = OLD.championship_id AND c.organizador_id = auth.uid()
  ) INTO is_owner;
  IF is_owner THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid()
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.championship_id IS NOT DISTINCT FROM OLD.championship_id
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND NEW.invited_by IS NOT DISTINCT FROM OLD.invited_by
     AND NEW.can_qrcode IS NOT DISTINCT FROM OLD.can_qrcode
     AND NEW.can_inscricoes IS NOT DISTINCT FROM OLD.can_inscricoes
     AND NEW.can_chaveamento IS NOT DISTINCT FROM OLD.can_chaveamento
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
     AND NEW.status IN ('pendente', 'aceito', 'recusado') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissao para alterar privilegios da equipe';
END;
$$;

DROP TRIGGER IF EXISTS championship_staff_permissions_guard ON championship_staff;
CREATE TRIGGER championship_staff_permissions_guard
  BEFORE UPDATE ON championship_staff
  FOR EACH ROW EXECUTE FUNCTION protect_championship_staff_permissions();

-- Remove as politicas antigas, inclusive nomes usados por migracoes anteriores.
DROP POLICY IF EXISTS championship_staff_select ON championship_staff;
DROP POLICY IF EXISTS championship_staff_insert ON championship_staff;
DROP POLICY IF EXISTS championship_staff_update ON championship_staff;
DROP POLICY IF EXISTS championship_staff_delete ON championship_staff;
DROP POLICY IF EXISTS championship_staff_select_related ON championship_staff;
DROP POLICY IF EXISTS championship_staff_insert_owner ON championship_staff;
DROP POLICY IF EXISTS championship_staff_update_related ON championship_staff;
DROP POLICY IF EXISTS championship_staff_delete_owner ON championship_staff;

CREATE POLICY championship_staff_select ON championship_staff FOR SELECT USING (
  user_id = auth.uid() OR invited_by = auth.uid() OR EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_staff.championship_id AND c.organizador_id = auth.uid()
  )
);
CREATE POLICY championship_staff_insert ON championship_staff FOR INSERT WITH CHECK (
  invited_by = auth.uid() AND EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_staff.championship_id AND c.organizador_id = auth.uid()
  )
);
CREATE POLICY championship_staff_update ON championship_staff FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_staff.championship_id AND c.organizador_id = auth.uid()
  )
) WITH CHECK (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_staff.championship_id AND c.organizador_id = auth.uid()
  )
);
CREATE POLICY championship_staff_delete ON championship_staff FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_staff.championship_id AND c.organizador_id = auth.uid()
  )
);

-- 3) Staff aceito com can_chaveamento pode operar o bracket.
DROP POLICY IF EXISTS bracket_insert ON bracket_matches;
DROP POLICY IF EXISTS bracket_update ON bracket_matches;
DROP POLICY IF EXISTS bracket_delete ON bracket_matches;

CREATE POLICY bracket_insert ON bracket_matches FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM championship_staff cs
    WHERE cs.championship_id = bracket_matches.championship_id
      AND cs.user_id = auth.uid() AND cs.status = 'aceito' AND cs.can_chaveamento
  )
);
CREATE POLICY bracket_update ON bracket_matches FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM championship_staff cs
    WHERE cs.championship_id = bracket_matches.championship_id
      AND cs.user_id = auth.uid() AND cs.status = 'aceito' AND cs.can_chaveamento
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM championship_staff cs
    WHERE cs.championship_id = bracket_matches.championship_id
      AND cs.user_id = auth.uid() AND cs.status = 'aceito' AND cs.can_chaveamento
  )
);
CREATE POLICY bracket_delete ON bracket_matches FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM championships c
    WHERE c.id = championship_id AND c.organizador_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM championship_staff cs
    WHERE cs.championship_id = bracket_matches.championship_id
      AND cs.user_id = auth.uid() AND cs.status = 'aceito' AND cs.can_chaveamento
  )
);

-- 4) O painel de inscricoes/chaveamento do staff precisa ler as inscricoes.
DROP POLICY IF EXISTS registrations_select_staff ON registrations;
CREATE POLICY registrations_select_staff ON registrations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM championship_staff cs
    WHERE cs.championship_id = registrations.championship_id
      AND cs.user_id = auth.uid()
      AND cs.status = 'aceito'
      AND (cs.can_inscricoes OR cs.can_chaveamento)
  )
);

-- 5) Historico de rating e escrito exclusivamente pela Server Action autorizada,
-- que usa service_role. A politica antiga permitia INSERT para qualquer login.
DROP POLICY IF EXISTS rating_history_insert ON rating_history;
REVOKE INSERT ON TABLE rating_history FROM authenticated;
GRANT ALL ON TABLE rating_history TO service_role;

-- 6) Uma conta autenticada conseguia criar a propria credencial para qualquer
-- campeonato. Credenciais passam a nascer apenas nos fluxos server-side.
DROP POLICY IF EXISTS credentials_insert ON credentials;
REVOKE INSERT ON TABLE credentials FROM authenticated;
GRANT ALL ON TABLE credentials TO service_role;

-- Organizer/staff pode fazer check-in, mas nao trocar atleta, papel ou token QR.
CREATE OR REPLACE FUNCTION protect_credential_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.championship_id IS DISTINCT FROM OLD.championship_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.qr_token IS DISTINCT FROM OLD.qr_token
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Somente os campos de check-in podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credentials_identity_guard ON credentials;
CREATE TRIGGER credentials_identity_guard
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION protect_credential_identity();

-- 7) A policy antiga aceitava championship_id nulo e permitia que qualquer
-- login enviasse notificacoes para qualquer conta. Todos os emissores do app
-- agora passam por Server Actions autorizadas com service_role.
DROP POLICY IF EXISTS notif_insert ON notifications;
REVOKE INSERT ON TABLE notifications FROM authenticated;
GRANT ALL ON TABLE notifications TO service_role;

-- 8) Atletas podiam alterar diretamente valor/status de pagamento da propria
-- inscricao e todos os campos da dupla. As mutacoes agora passam pelas Actions.
DROP POLICY IF EXISTS registrations_update ON registrations;
DROP POLICY IF EXISTS registrations_insert ON registrations;
REVOKE INSERT, UPDATE ON TABLE registrations FROM authenticated;
GRANT ALL ON TABLE registrations TO service_role;

DROP POLICY IF EXISTS teams_update ON teams;
DROP POLICY IF EXISTS teams_insert ON teams;
REVOKE INSERT, UPDATE ON TABLE teams FROM authenticated;
GRANT ALL ON TABLE teams TO service_role;

-- O UUID publico da dupla nao pode funcionar como segredo de convite.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();
UPDATE teams SET invite_token = gen_random_uuid() WHERE invite_token IS NULL;
ALTER TABLE teams ALTER COLUMN invite_token SET DEFAULT gen_random_uuid();
ALTER TABLE teams ALTER COLUMN invite_token SET NOT NULL;
REVOKE SELECT ON TABLE teams FROM anon, authenticated;
GRANT SELECT (
  id, championship_id, category_id, atleta1_id, atleta2_id,
  parceiro_username, status, created_at
) ON TABLE teams TO anon, authenticated;
GRANT ALL ON TABLE teams TO service_role;

-- 9) Funcoes SECURITY DEFINER de estoque/cupom/taxa podiam ser chamadas
-- diretamente para alterar contadores e divida Elite.
REVOKE ALL ON FUNCTION claim_pricing_tier(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_pricing_tier(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_coupon_use(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_coupon_use(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_elite_fee(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_elite_fee(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_pricing_tier(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION release_pricing_tier(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION claim_coupon_use(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION release_coupon_use(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION claim_elite_fee(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION release_elite_fee(uuid, numeric) TO service_role;

-- RPC legado expunha o e-mail de qualquer organizador e permitia spam.
DO $$
BEGIN
  IF to_regprocedure('public.notify_page_championship_invite(uuid,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION notify_page_championship_invite(uuid, uuid) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- 10) O aluno podia inserir/ativar o proprio vinculo sem convite nem pagamento.
DROP POLICY IF EXISTS "arena_students_own" ON arena_students;
DROP POLICY IF EXISTS "arena_students_dono_write" ON arena_students;
DROP POLICY IF EXISTS arena_students_select_own ON arena_students;
CREATE POLICY arena_students_select_own ON arena_students FOR SELECT
  USING (user_id = auth.uid());
REVOKE INSERT, UPDATE ON TABLE arena_students FROM authenticated;
GRANT ALL ON TABLE arena_students TO service_role;

-- Status da assinatura da plataforma nunca e definido pelo dono da arena.
DROP POLICY IF EXISTS "arena_subs_own" ON arena_subscriptions;
DROP POLICY IF EXISTS arena_subscriptions_select_own ON arena_subscriptions;
CREATE POLICY arena_subscriptions_select_own ON arena_subscriptions FOR SELECT
  USING (user_id = auth.uid());
REVOKE INSERT, UPDATE ON TABLE arena_subscriptions FROM authenticated;
GRANT ALL ON TABLE arena_subscriptions TO service_role;

-- Reservas e diarias nao podem nascer como "pagas" por escrita direta.
DROP POLICY IF EXISTS "arena_rentals_insert" ON arena_rentals;
REVOKE INSERT, UPDATE, DELETE ON TABLE arena_rentals FROM authenticated;
GRANT SELECT ON TABLE arena_rentals TO authenticated;
GRANT ALL ON TABLE arena_rentals TO service_role;

DROP POLICY IF EXISTS "autenticado_inserir_diaria" ON arena_daily_passes;
REVOKE INSERT, UPDATE, DELETE ON TABLE arena_daily_passes FROM authenticated;
GRANT SELECT ON TABLE arena_daily_passes TO authenticated;
GRANT ALL ON TABLE arena_daily_passes TO service_role;

-- Metadados usados pela trava de idempotencia e pelo cron de liquidacao dos
-- repasses de arena. As colunas antigas guardavam apenas o status.
ALTER TABLE arena_rentals
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_transfer_id text,
  ADD COLUMN IF NOT EXISTS repasse_erro text;

ALTER TABLE arena_daily_passes
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_transfer_id text,
  ADD COLUMN IF NOT EXISTS repasse_erro text;

ALTER TABLE student_charges
  ADD COLUMN IF NOT EXISTS repasse_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS repasse_data_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_transfer_id text,
  ADD COLUMN IF NOT EXISTS repasse_erro text;
ALTER TABLE student_charges DROP CONSTRAINT IF EXISTS student_charges_repasse_status_check;
ALTER TABLE student_charges ADD CONSTRAINT student_charges_repasse_status_check
  CHECK (repasse_status IN ('pendente','processando','aguardando_liquidacao','concluido','estornado'));
CREATE UNIQUE INDEX IF NOT EXISTS student_charges_asaas_payment_unique
  ON student_charges (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON TABLE student_charges FROM authenticated;
GRANT SELECT ON TABLE student_charges TO authenticated;
GRANT ALL ON TABLE student_charges TO service_role;

-- 11) Arquivos publicos continuam legiveis, mas cada login so grava na pasta
-- cujo primeiro segmento e o proprio auth.uid().
DROP POLICY IF EXISTS "page-images upload" ON storage.objects;
DROP POLICY IF EXISTS "page-images update" ON storage.objects;
DROP POLICY IF EXISTS "page-images delete own" ON storage.objects;
DROP POLICY IF EXISTS "page-images public read" ON storage.objects;
DROP POLICY IF EXISTS page_images_owner_insert ON storage.objects;
DROP POLICY IF EXISTS page_images_owner_update ON storage.objects;
DROP POLICY IF EXISTS page_images_owner_delete ON storage.objects;
DROP POLICY IF EXISTS page_images_public_read ON storage.objects;
CREATE POLICY page_images_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY page_images_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY page_images_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'page-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY page_images_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'page-images');

DROP POLICY IF EXISTS regulamentos_upload ON storage.objects;
DROP POLICY IF EXISTS regulamentos_read ON storage.objects;
DROP POLICY IF EXISTS regulamentos_owner_insert ON storage.objects;
DROP POLICY IF EXISTS regulamentos_owner_update ON storage.objects;
DROP POLICY IF EXISTS regulamentos_owner_delete ON storage.objects;
DROP POLICY IF EXISTS regulamentos_public_read ON storage.objects;
CREATE POLICY regulamentos_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'regulamentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY regulamentos_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'regulamentos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'regulamentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY regulamentos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'regulamentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY regulamentos_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'regulamentos');

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'page-images';
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'regulamentos';

NOTIFY pgrst, 'reload schema';
