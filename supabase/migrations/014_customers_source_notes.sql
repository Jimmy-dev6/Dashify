-- Source (canal d’acquisition) et notes — à exécuter dans Supabase SQL Editor si besoin.
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.customers.source IS 'airbnb | booking | direct';
