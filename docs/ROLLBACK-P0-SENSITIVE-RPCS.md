# Rollback controlado — hardening RPCs P0

Não restaure acesso ao preço enviado pelo cliente, às RPCs Pix para
`authenticated` ou a contatos sem vínculo. O rollback recomendado é somente de
aplicação e mantém as funções seguras instaladas.

## Compatibilidade temporária da versão anterior

A versão anterior envia `p_preco_elite`. Se for indispensável reverter apenas o
deployment, aplique no mesmo ambiente este SQL de compatibilidade. As assinaturas
antigas ignoram o preço recebido e delegam à função segura.

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.ativar_championship_elite(
  p_champ_id uuid, p_preco_elite numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.ativar_championship_elite(p_champ_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_championship_elite(
  p_champ_id uuid, p_preco_elite numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.cancelar_championship_elite(p_champ_id);
END;
$$;

REVOKE ALL ON FUNCTION public.ativar_championship_elite(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_championship_elite(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_championship_elite(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_championship_elite(uuid, numeric) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
```

Quando o deployment seguro voltar, remova as assinaturas temporárias com
`DROP FUNCTION ... (uuid, numeric)`. A migration principal também faz essa remoção.

## Controles obrigatórios

1. Aplique primeiro em Sandbox e confirme os grants com `has_function_privilege`.
2. Registre SHA/deployment, estado inicial da fixture e resultado dos testes.
3. Em falha de aplicação, reverta o deployment e, somente se necessário, use os
   overloads seguros acima.
4. Não reabilite RPC Pix para usuários. A alteração continua restrita ao servidor,
   com reautenticação, titularidade, auditoria e cooldown.
5. Reexecute lint, typecheck, testes e smoke autenticado.

O índice do funil pode ser removido isoladamente com
`DROP INDEX public.public_funnel_events_dedupe_idx`, mas isso volta a permitir
duplicidade e só deve ocorrer junto de correção comprovada da aplicação.
