-- Dynamic pricing « Ultimate » : qualité, long séjour, early bird, événements locaux

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_score int,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS competitor_avg_price numeric(12, 2);

ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS long_stay_7_discount numeric(5, 4) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS long_stay_14_discount numeric(5, 4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS long_stay_30_discount numeric(5, 4) NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS early_bird_days int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS early_bird_multiplier numeric(5, 2) NOT NULL DEFAULT 1.10,
  ADD COLUMN IF NOT EXISTS quality_multiplier numeric(5, 2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS use_local_events boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.local_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'SN',
  city text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  impact_multiplier numeric(5, 2) NOT NULL DEFAULT 1.20,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_type text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_events_user_id ON public.local_events (user_id);
CREATE INDEX IF NOT EXISTS idx_local_events_dates ON public.local_events (start_date, end_date);

ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS local_events_own ON public.local_events;
CREATE POLICY local_events_own ON public.local_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
