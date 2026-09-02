-- RankFTV - operational data retention. Financial evidence is kept for six
-- years; short-lived security/telemetry data is retained only as long as it is
-- useful for fraud investigation and incident response.

CREATE OR REPLACE FUNCTION purge_rankftv_operational_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhooks integer := 0;
  v_card_attempts integer := 0;
  v_card_guards integer := 0;
  v_audit integer := 0;
  v_ticket_change_challenges integer := 0;
  v_financial integer := 0;
BEGIN
  DELETE FROM asaas_webhook_events
   WHERE (status IN ('processed', 'ignored') AND created_at < now() - interval '400 days')
      OR (status = 'failed' AND created_at < now() - interval '730 days');
  GET DIAGNOSTICS v_webhooks = ROW_COUNT;

  DELETE FROM payment_card_attempts WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_card_attempts = ROW_COUNT;

  DELETE FROM payment_card_guards
   WHERE updated_at < now() - interval '180 days'
     AND (blocked_until IS NULL OR blocked_until < now());
  GET DIAGNOSTICS v_card_guards = ROW_COUNT;

  DELETE FROM security_audit_log WHERE created_at < now() - interval '730 days';
  GET DIAGNOSTICS v_audit = ROW_COUNT;

  DELETE FROM athlete_ticket_change_challenges
   WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_ticket_change_challenges = ROW_COUNT;

  DELETE FROM financial_operations
   WHERE created_at < now() - interval '6 years'
     AND status IN ('provider_created', 'confirmed', 'refunded', 'failed', 'cancelled');
  GET DIAGNOSTICS v_financial = ROW_COUNT;

  RETURN jsonb_build_object(
    'webhookEvents', v_webhooks,
    'cardAttempts', v_card_attempts,
    'cardGuards', v_card_guards,
    'auditEvents', v_audit,
    'ticketChangeChallenges', v_ticket_change_challenges,
    'financialOperations', v_financial
  );
END;
$$;

REVOKE ALL ON FUNCTION purge_rankftv_operational_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_rankftv_operational_data() TO service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY migrations, 'production-data-retention done';
