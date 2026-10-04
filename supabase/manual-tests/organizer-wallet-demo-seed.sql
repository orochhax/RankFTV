-- Dados demonstrativos idempotentes para o campeonato financeiro do Sandbox.
-- NAO executar em producao. Os IDs e dados pessoais abaixo sao ficticios.
BEGIN;

DO $$
DECLARE
  v_championship constant uuid := '2b3bb52c-2043-4167-aa7f-9e4359bd6dd9';
  v_category uuid;
  v_category_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.championships WHERE id=v_championship) THEN
    RAISE EXCEPTION 'DEMO_CHAMPIONSHIP_NOT_FOUND';
  END IF;

  SELECT id,nome INTO v_category,v_category_name
  FROM public.championship_categories
  WHERE championship_id=v_championship
  ORDER BY created_at,id
  LIMIT 1;
  IF v_category IS NULL THEN RAISE EXCEPTION 'DEMO_CATEGORY_NOT_FOUND'; END IF;

  INSERT INTO public.athlete_tickets (
    id,championship_id,category_id,categoria_nome,
    comprador_nome,comprador_cpf,comprador_email,comprador_zap,comprador_genero,
    parceiro_nome,parceiro_cpf,parceiro_email,parceiro_zap,parceiro_genero,
    valor,status_pagamento,billing_type,asaas_payment_id,
    repasse_data_prevista,repasse_status,code,access_token,created_at
  )
  SELECT
    demo.id,v_championship,v_category,v_category_name,
    demo.comprador,demo.cpf_comprador,demo.email_comprador,'71999990000','masculino',
    demo.parceiro,demo.cpf_parceiro,demo.email_parceiro,'71999990001','masculino',
    demo.valor,demo.status,demo.billing_type,demo.payment_id,
    demo.liberacao,demo.repasse_status,demo.code,gen_random_uuid()::text,demo.criado_em
  FROM (VALUES
    ('d8100000-0000-4000-8000-000000000001'::uuid,'Rafael Almeida','90000000001','rafael.demo@example.invalid','Bruno Costa','90000000002','bruno.demo@example.invalid',120.00,'pago','PIX','demo_pix_001',now()-interval '8 days','disponivel','DEMO-W001',now()-interval '8 days'),
    ('d8100000-0000-4000-8000-000000000002'::uuid,'Caio Martins','90000000003','caio.demo@example.invalid','Lucas Rocha','90000000004','lucas.demo@example.invalid',95.00,'pago','PIX','demo_pix_002',now()-interval '7 days','disponivel','DEMO-W002',now()-interval '7 days'),
    ('d8100000-0000-4000-8000-000000000003'::uuid,'Felipe Santos','90000000005','felipe.demo@example.invalid','André Lima','90000000006','andre.demo@example.invalid',150.00,'pago','PIX','demo_pix_003',now()-interval '6 days','disponivel','DEMO-W003',now()-interval '6 days'),
    ('d8100000-0000-4000-8000-000000000004'::uuid,'Gustavo Melo','90000000007','gustavo.demo@example.invalid','Diego Alves','90000000008','diego.demo@example.invalid',110.00,'pago','PIX','demo_pix_004',now()-interval '5 days','disponivel','DEMO-W004',now()-interval '5 days'),
    ('d8100000-0000-4000-8000-000000000005'::uuid,'Henrique Souza','90000000009','henrique.demo@example.invalid','Marcelo Reis','90000000010','marcelo.demo@example.invalid',180.00,'pago','CREDIT_CARD','demo_card_005',now()+interval '15 days','aguardando_liquidacao','DEMO-W005',now()-interval '4 days'),
    ('d8100000-0000-4000-8000-000000000006'::uuid,'Tiago Freitas','90000000011','tiago.demo@example.invalid','Vitor Nunes','90000000012','vitor.demo@example.invalid',135.00,'pago','CREDIT_CARD','demo_card_006',now()+interval '16 days','aguardando_liquidacao','DEMO-W006',now()-interval '3 days'),
    ('d8100000-0000-4000-8000-000000000007'::uuid,'Eduardo Pinto','90000000013','eduardo.demo@example.invalid','João Ramos','90000000014','joao.demo@example.invalid',220.00,'pago','CREDIT_CARD','demo_card_007',now()+interval '17 days','aguardando_liquidacao','DEMO-W007',now()-interval '2 days'),
    ('d8100000-0000-4000-8000-000000000008'::uuid,'Daniel Teixeira','90000000015','daniel.demo@example.invalid','Igor Barbosa','90000000016','igor.demo@example.invalid',160.00,'pago','DEBIT_CARD','demo_debit_008',now()+interval '3 days','aguardando_liquidacao','DEMO-W008',now()-interval '1 day'),
    ('d8100000-0000-4000-8000-000000000009'::uuid,'Murilo Campos','90000000017','murilo.demo@example.invalid','Renato Dias','90000000018','renato.demo@example.invalid',125.00,'pendente','PIX',NULL,NULL,'pendente','DEMO-W009',now()-interval '12 hours'),
    ('d8100000-0000-4000-8000-000000000010'::uuid,'Leandro Moraes','90000000019','leandro.demo@example.invalid','Fábio Vieira','90000000020','fabio.demo@example.invalid',140.00,'pendente','CREDIT_CARD',NULL,NULL,'pendente','DEMO-W010',now()-interval '6 hours'),
    ('d8100000-0000-4000-8000-000000000011'::uuid,'Samuel Castro','90000000021','samuel.demo@example.invalid','Otávio Neves','90000000022','otavio.demo@example.invalid',100.00,'estornado','PIX','demo_refund_011',NULL,'estornado','DEMO-W011',now()-interval '9 days')
  ) AS demo(
    id,comprador,cpf_comprador,email_comprador,parceiro,cpf_parceiro,email_parceiro,
    valor,status,billing_type,payment_id,liberacao,repasse_status,code,criado_em
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';

SELECT
  count(*) FILTER (WHERE status_pagamento='pago') AS vendas_pagas_demo,
  count(*) FILTER (WHERE status_pagamento='pendente') AS vendas_pendentes_demo,
  count(*) FILTER (WHERE status_pagamento='estornado') AS vendas_estornadas_demo
FROM public.athlete_tickets
WHERE id::text LIKE 'd8100000-0000-4000-8000-%';
