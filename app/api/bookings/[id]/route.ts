import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================================
// Helpers
// =====================================================================

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

// =====================================================================
// GET /api/bookings/[id]
// Retourne les détails enrichis d'une réservation : booking + customer
// + property + quote lié (si existant).
// Utilisé par le modal "Détails réservation" du calendrier.
// =====================================================================

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookingId } = await params;

  if (!bookingId || !isValidUuid(bookingId)) {
    return NextResponse.json(
      { error: "ID de réservation invalide." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -------------------------------------------------------------------
  // 1. Fetch booking (filtré par user_id pour double-couche sécu)
  // -------------------------------------------------------------------
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, user_id, property_id, customer_id, check_in, check_out, guests, total, status, source, payment_transaction_id, created_at",
    )
    .eq("id", bookingId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (bookingError) {
    console.error("[GET /api/bookings/[id]] booking fetch error:", bookingError.message);
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  // -------------------------------------------------------------------
  // 2. Fetch customer + property en parallèle
  // -------------------------------------------------------------------
  const [customerRes, propertyRes] = await Promise.all([
    booking.customer_id
      ? supabase
          .from("customers")
          .select("id, name, phone, email")
          .eq("id", booking.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    supabase
      .from("properties")
      .select("id, name, cover_image_url, currency")
      .eq("id", booking.property_id)
      .maybeSingle(),
  ]);

  if (customerRes.error) {
    console.error("[GET /api/bookings/[id]] customer fetch error:", customerRes.error.message);
  }
  if (propertyRes.error) {
    console.error("[GET /api/bookings/[id]] property fetch error:", propertyRes.error.message);
  }

  // -------------------------------------------------------------------
  // 3. Fetch quote lié (s'il existe)
  //    Convention : un devis accepté qui a généré une booking est
  //    rattaché par customer_id + property_id + dates.
  //    On prend le plus récent qui matche.
  // -------------------------------------------------------------------
  let quote: {
    id: string;
    payment_reference: string | null;
    payment_method_used: string | null;
    payment_confirmed_at: string | null;
    sent_at: string | null;
  } | null = null;

  if (booking.customer_id) {
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("id, payment_reference, payment_method_used, payment_confirmed_at, sent_at")
      .eq("customer_id", booking.customer_id)
      .eq("property_id", booking.property_id)
      .eq("check_in", booking.check_in)
      .eq("check_out", booking.check_out)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (quoteError) {
      console.error("[GET /api/bookings/[id]] quote fetch error:", quoteError.message);
    } else if (quoteData) {
      quote = {
        id: quoteData.id,
        payment_reference: quoteData.payment_reference ?? null,
        payment_method_used: quoteData.payment_method_used ?? null,
        payment_confirmed_at: quoteData.payment_confirmed_at ?? null,
        sent_at: quoteData.sent_at ?? null,
      };
    }
  }

  // -------------------------------------------------------------------
  // 4. Construction de la réponse
  // -------------------------------------------------------------------
  return NextResponse.json({
    booking: {
      id: booking.id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guests: booking.guests,
      total: Number(booking.total ?? 0),
      status: booking.status,
      source: booking.source ?? "direct",
      nights: nightsBetween(booking.check_in, booking.check_out),
      created_at: booking.created_at,
    },
    customer: customerRes.data
      ? {
          id: customerRes.data.id,
          name: customerRes.data.name,
          phone: customerRes.data.phone ?? null,
          email: customerRes.data.email ?? null,
        }
      : null,
    property: propertyRes.data
      ? {
          id: propertyRes.data.id,
          name: propertyRes.data.name,
          cover_image_url: propertyRes.data.cover_image_url ?? null,
          currency: propertyRes.data.currency ?? "XOF",
        }
      : null,
    quote,
  });
}

// =====================================================================
// PATCH /api/bookings/[id]
// Annule une réservation (status='cancelled').
// Le trigger sync_booking_to_calendar_event_trigger nettoie
// automatiquement le calendar_event correspondant.
// =====================================================================

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (body.status !== "cancelled") {
    return NextResponse.json(
      { error: "Seule l'annulation (status=cancelled) est supportée." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}