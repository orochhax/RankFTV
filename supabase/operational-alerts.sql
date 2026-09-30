BEGIN;

CREATE TABLE IF NOT EXISTS public.operational_alert_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  payment_pending_enabled boolean NOT NULL DEFAULT true,
  webhook_failed_enabled boolean NOT NULL DEFAULT true,
  assisted_refund_enabled boolean NOT NULL DEFAULT true,
  payout_rejected_enabled boolean NOT NULL DEFAULT true,
  payment_pending_minutes integer NOT NULL DEFAULT 30 CHECK (payment_pending_minutes BETWEEN 5 AND 1440),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.operational_alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('payment_pending', 'webhook_failed', 'assisted_refund', 'payout_rejected')),
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  title text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS operational_alerts_status_idx ON public.operational_alerts (status, detected_at DESC);

ALTER TABLE public.operational_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_alert_settings, public.operational_alerts FROM anon, authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
