CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  cancellation_type text NOT NULL DEFAULT 'non_refundable'
    CHECK (cancellation_type IN ('non_refundable', 'flexible', 'moderate')),
  cancellation_days int NOT NULL DEFAULT 0,
  cancellation_percent int NOT NULL DEFAULT 0,
  deposit_type text NOT NULL DEFAULT 'none'
    CHECK (deposit_type IN ('none', 'fixed', 'percent')),
  deposit_value numeric(10, 2) NOT NULL DEFAULT 0,
  quote_expiry_hours int NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_user_id ON public.policies (user_id);

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES public.policies (id) ON DELETE SET NULL;

CREATE INDEX idx_quotes_policy_id ON public.quotes (policy_id);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own policies" ON public.policies
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
