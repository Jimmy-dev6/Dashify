-- Empêche tout chevauchement de plages pour un même logement (hors annulés).
ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_property_daterange_excl
EXCLUDE USING gist (
  property_id WITH =,
  date_range WITH &&
)
WHERE
  (status <> 'cancelled'::public.calendar_event_status);
