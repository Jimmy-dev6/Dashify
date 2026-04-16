CREATE TYPE public.quote_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'refused',
  'expired'
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  wa_message text,
  status public.quote_status NOT NULL DEFAULT 'draft',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_user_id ON public.quotes (user_id);

CREATE INDEX idx_quotes_status_expires ON public.quotes (status, expires_at);
