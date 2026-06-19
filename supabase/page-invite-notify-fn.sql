-- Função SECURITY DEFINER: insere notificação para o organizador
-- e retorna dados para o servidor enviar o email.
-- Roda com permissões de postgres, não do usuário logado.

CREATE OR REPLACE FUNCTION notify_page_championship_invite(
  p_championship_id UUID,
  p_page_id         UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id      UUID;
  v_org_email   TEXT;
  v_org_nome    TEXT;
  v_camp_nome   TEXT;
  v_page_nome   TEXT;
  v_page_handle TEXT;
BEGIN
  -- Busca dados do campeonato
  SELECT organizador_id, nome
    INTO v_org_id, v_camp_nome
    FROM public.championships
   WHERE id = p_championship_id;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Busca email do organizador em auth.users (requer SECURITY DEFINER)
  SELECT email INTO v_org_email
    FROM auth.users
   WHERE id = v_org_id;

  -- Busca nome do organizador em profiles
  SELECT nome INTO v_org_nome
    FROM public.profiles
   WHERE id = v_org_id;

  -- Busca dados da página
  SELECT nome, handle
    INTO v_page_nome, v_page_handle
    FROM public.pages
   WHERE id = p_page_id;

  -- Insere notificação in-site para o organizador (bypassa RLS)
  INSERT INTO public.notifications (user_id, championship_id, tipo, titulo, mensagem, lida)
  VALUES (
    v_org_id,
    NULL,
    'convite_pagina',
    'Convite de vínculo com página',
    'A página "' || v_page_nome || '" (@' || v_page_handle || ') quer vincular "' || v_camp_nome || '" como etapa dela. Acesse o painel do campeonato para aceitar ou recusar.',
    false
  );

  RETURN json_build_object(
    'org_email',   v_org_email,
    'org_nome',    COALESCE(v_org_nome, 'Organizador'),
    'camp_nome',   v_camp_nome,
    'page_nome',   v_page_nome,
    'page_handle', v_page_handle
  );
END;
$$;

-- Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION notify_page_championship_invite(UUID, UUID) TO authenticated;
