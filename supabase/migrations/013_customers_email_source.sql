-- E-mail optionnel pour la fiche client (UI Dashify).
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email text;
