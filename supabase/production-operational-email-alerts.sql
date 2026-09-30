BEGIN;

ALTER TABLE public.operational_alert_settings
  ADD COLUMN IF NOT EXISTS email_queue_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_queue_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS email_queue_backlog_threshold integer NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operational_alert_settings_email_queue_minutes_check'
      AND conrelid = 'public.operational_alert_settings'::regclass
  ) THEN
    ALTER TABLE public.operational_alert_settings
      ADD CONSTRAINT operational_alert_settings_email_queue_minutes_check
      CHECK (email_queue_minutes BETWEEN 5 AND 1440);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operational_alert_settings_email_queue_threshold_check'
      AND conrelid = 'public.operational_alert_settings'::regclass
  ) THEN
    ALTER TABLE public.operational_alert_settings
      ADD CONSTRAINT operational_alert_settings_email_queue_threshold_check
      CHECK (email_queue_backlog_threshold BETWEEN 1 AND 500);
  END IF;
END $$;

ALTER TABLE public.operational_alerts
  DROP CONSTRAINT IF EXISTS operational_alerts_kind_check;
ALTER TABLE public.operational_alerts
  ADD CONSTRAINT operational_alerts_kind_check
  CHECK (kind IN (
    'payment_pending', 'webhook_failed', 'assisted_refund', 'payout_rejected',
    'email_queue_backlog', 'email_delivery_failed'
  ));

CREATE INDEX IF NOT EXISTS championship_notice_deliveries_alert_queue_idx
  ON public.championship_notice_deliveries (status, created_at)
  WHERE status IN ('queued', 'processing', 'failed');
CREATE INDEX IF NOT EXISTS organizer_financial_notification_alert_queue_idx
  ON public.organizer_financial_notification_deliveries (status, created_at)
  WHERE status IN ('queued', 'processing', 'failed');

ALTER TABLE public.operational_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_alert_settings, public.operational_alerts
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.operational_alert_settings, public.operational_alerts
  TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
