CREATE TYPE public.calendar_event_source AS ENUM (
  'airbnb',
  'booking',
  'dashify',
  'other'
);

CREATE TYPE public.calendar_event_status AS ENUM ('confirmed', 'cancelled');

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.property_channels (id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  date_range daterange GENERATED ALWAYS AS (daterange (start_date, end_date, '[)')) STORED,
  source public.calendar_event_source NOT NULL DEFAULT 'other',
  external_uid text NOT NULL,
  status public.calendar_event_status NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_property_dates ON public.calendar_events (property_id, start_date, end_date);

-- iCal : un UID par canal
CREATE UNIQUE INDEX uq_calendar_events_channel_uid ON public.calendar_events (channel_id, external_uid)
WHERE
  channel_id IS NOT NULL;

-- Réservations internes Dashify
CREATE UNIQUE INDEX uq_calendar_events_dashify_uid ON public.calendar_events (property_id, external_uid)
WHERE
  source = 'dashify';
