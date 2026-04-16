CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'completed');

CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_id ON public.bookings (user_id);

CREATE INDEX idx_bookings_property_id ON public.bookings (property_id);
