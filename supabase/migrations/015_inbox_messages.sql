-- Boîte de réception : messages (WhatsApp loggés depuis Dashify, liens OTA, notes internes).
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (
    platform IN (
      'whatsapp',
      'airbnb',
      'booking',
      'dashify'
    )
  ),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  external_url text,
  is_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_user_created ON public.messages (user_id, created_at DESC);

CREATE INDEX idx_messages_conversation ON public.messages (user_id, customer_id, property_id, platform, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_own ON public.messages FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
