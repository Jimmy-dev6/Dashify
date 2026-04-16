CREATE OR REPLACE FUNCTION public.fn_booking_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text := 'dashify:booking:' || NEW.id::text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.calendar_events (
        property_id,
        channel_id,
        start_date,
        end_date,
        source,
        external_uid,
        status
      )
      VALUES (
        NEW.property_id,
        NULL,
        NEW.check_in,
        NEW.check_out,
        'dashify'::public.calendar_event_source,
        uid,
        'confirmed'::public.calendar_event_status
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled'::public.booking_status THEN
      UPDATE public.calendar_events
      SET
        status = 'cancelled'::public.calendar_event_status,
        updated_at = now()
      WHERE
        external_uid = uid
        AND source = 'dashify'::public.calendar_event_source;
    END IF;

    IF NEW.status = 'confirmed'::public.booking_status THEN
      IF EXISTS (
        SELECT
          1
        FROM
          public.calendar_events e
        WHERE
          e.external_uid = uid
          AND e.source = 'dashify'::public.calendar_event_source
      ) THEN
        UPDATE public.calendar_events
        SET
          start_date = NEW.check_in,
          end_date = NEW.check_out,
          status = 'confirmed'::public.calendar_event_status,
          updated_at = now()
        WHERE
          external_uid = uid
          AND source = 'dashify'::public.calendar_event_source;
      ELSE
        INSERT INTO public.calendar_events (
          property_id,
          channel_id,
          start_date,
          end_date,
          source,
          external_uid,
          status
        )
        VALUES (
          NEW.property_id,
          NULL,
          NEW.check_in,
          NEW.check_out,
          'dashify'::public.calendar_event_source,
          uid,
          'confirmed'::public.calendar_event_status
        );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_calendar ON public.bookings;

CREATE TRIGGER trg_booking_calendar
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_booking_to_calendar();
