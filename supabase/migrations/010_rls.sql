ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.property_channels ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- properties
CREATE POLICY properties_select_own ON public.properties
FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY properties_insert_own ON public.properties
FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY properties_update_own ON public.properties
FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY properties_delete_own ON public.properties
FOR DELETE
  USING (user_id = auth.uid());

-- property_channels : via propriété du même utilisateur
CREATE POLICY property_channels_select ON public.property_channels
FOR SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = property_channels.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY property_channels_insert ON public.property_channels
FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = property_channels.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY property_channels_update ON public.property_channels
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = property_channels.property_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = property_channels.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY property_channels_delete ON public.property_channels
FOR DELETE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = property_channels.property_id
        AND p.user_id = auth.uid()
    )
  );

-- calendar_events
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = calendar_events.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_events_insert ON public.calendar_events
FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = calendar_events.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_events_update ON public.calendar_events
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = calendar_events.property_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = calendar_events.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_events_delete ON public.calendar_events
FOR DELETE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.properties p
      WHERE
        p.id = calendar_events.property_id
        AND p.user_id = auth.uid()
    )
  );

-- customers
CREATE POLICY customers_select_own ON public.customers
FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY customers_insert_own ON public.customers
FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_update_own ON public.customers
FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_delete_own ON public.customers
FOR DELETE
  USING (user_id = auth.uid());

-- bookings
CREATE POLICY bookings_select_own ON public.bookings
FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY bookings_insert_own ON public.bookings
FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookings_update_own ON public.bookings
FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookings_delete_own ON public.bookings
FOR DELETE
  USING (user_id = auth.uid());

-- quotes
CREATE POLICY quotes_select_own ON public.quotes
FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY quotes_insert_own ON public.quotes
FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quotes_update_own ON public.quotes
FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quotes_delete_own ON public.quotes
FOR DELETE
  USING (user_id = auth.uid());
