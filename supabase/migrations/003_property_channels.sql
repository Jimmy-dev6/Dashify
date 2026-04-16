CREATE TYPE public.channel_platform AS ENUM ('airbnb', 'booking', 'other');

CREATE TABLE public.property_channels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  platform public.channel_platform NOT NULL DEFAULT 'other',
  ical_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_error text,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_channels_property_id ON public.property_channels (property_id);

CREATE INDEX idx_property_channels_active ON public.property_channels (property_id)
WHERE is_active = true;
