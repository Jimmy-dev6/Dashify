-- Frais, promotions, suppléments + extension des devis
-- Les tables peuvent déjà exister côté projet distant : IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

CREATE TABLE IF NOT EXISTS public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other'
    CHECK (type IN ('cleaning', 'tourist_tax', 'other')),
  amount_type text NOT NULL DEFAULT 'fixed'
    CHECK (amount_type IN ('fixed', 'percent', 'per_night', 'per_guest')),
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_user_id ON public.fees (user_id);
CREATE INDEX IF NOT EXISTS idx_fees_property_id ON public.fees (property_id);

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(12, 2) NOT NULL DEFAULT 0,
  min_nights int NOT NULL DEFAULT 1,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_user_code_lower
  ON public.promotions (user_id, (lower(code)));

CREATE INDEX IF NOT EXISTS idx_promotions_user_id ON public.promotions (user_id);

CREATE TABLE IF NOT EXISTS public.supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12, 2) NOT NULL DEFAULT 0,
  price_type text NOT NULL DEFAULT 'per_stay'
    CHECK (price_type IN ('per_stay', 'per_night', 'per_person')),
  is_optional boolean NOT NULL DEFAULT true,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplements_user_id ON public.supplements (user_id);
CREATE INDEX IF NOT EXISTS idx_supplements_property_id ON public.supplements (property_id);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_discount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplement_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_extras jsonb;

-- RLS
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fees_own ON public.fees;
CREATE POLICY fees_own ON public.fees
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS promotions_own ON public.promotions;
CREATE POLICY promotions_own ON public.promotions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS supplements_own ON public.supplements;
CREATE POLICY supplements_own ON public.supplements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
