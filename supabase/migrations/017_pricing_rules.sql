CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  min_price numeric(10, 2) NOT NULL DEFAULT 0,
  max_price numeric(10, 2) NOT NULL DEFAULT 0,
  weekend_multiplier numeric(4, 2) NOT NULL DEFAULT 1.2,
  lastminute_days int NOT NULL DEFAULT 3,
  lastminute_discount numeric(4, 2) NOT NULL DEFAULT 0.85,
  high_occupancy_threshold int NOT NULL DEFAULT 80,
  high_occupancy_multiplier numeric(4, 2) NOT NULL DEFAULT 1.1,
  low_occupancy_threshold int NOT NULL DEFAULT 30,
  low_occupancy_multiplier numeric(4, 2) NOT NULL DEFAULT 0.9,
  seasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_rules_property_unique UNIQUE (property_id)
);

CREATE INDEX idx_pricing_rules_user_id ON public.pricing_rules (user_id);

CREATE OR REPLACE FUNCTION public.fn_pricing_rules_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_rules_updated_at ON public.pricing_rules;

CREATE TRIGGER trg_pricing_rules_updated_at
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.fn_pricing_rules_set_updated_at();

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pricing rules" ON public.pricing_rules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
