import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function parseMonth(value: string | null) {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1; // 0-based
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

/** ISO date (YYYY-MM-DD) from a UTC instant — month boundaries stay correct in all timezones. */
function toIsoDateUtc(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse external_uid au format "<kind>:<uuid>".
 * Renvoie null si le format ne matche pas.
 *
 * Conventions Dashify :
 * - "booking:<uuid>" → calendar_event créé par le trigger sync_booking_to_calendar_event
 * - "quote:<uuid>"   → hold de devis créé par lib/quotes/hold-calendar.ts
 */
function parseExternalUid(uid: string | null): { kind: "booking" | "quote"; id: string } | null {
  if (!uid) return null;
  const idx = uid.indexOf(":");
  if (idx === -1) return null;
  const kind = uid.slice(0, idx);
  const id = uid.slice(idx + 1);
  if (kind !== "booking" && kind !== "quote") return null;
  if (!id) return null;
  return { kind, id };
}

type CalendarEventRow = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  source: "airbnb" | "booking" | "dashify" | "other" | "quote_hold";
  status: "confirmed" | "cancelled" | "pending";
  external_uid: string | null;
};

type EnrichedCalendarEvent = CalendarEventRow & {
  booking_id: string | null;
  quote_id: string | null;
  customer_name: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const month = parseMonth(searchParams.get("month"));

  if (!propertyId || !month) {
    return NextResponse.json(
      { error: "Paramètres invalides: propertyId, month=YYYY-MM requis." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthStart = new Date(Date.UTC(month.year, month.monthIndex, 1));
  const nextMonthStart = new Date(Date.UTC(month.year, month.monthIndex + 1, 1));

  // Règle demi-ouverte: [start_date, end_date)
  const start = toIsoDateUtc(monthStart);
  const end = toIsoDateUtc(nextMonthStart);

  const { data: rawEvents, error } = await supabase
    .from("calendar_events")
    .select("id, property_id, start_date, end_date, source, status, external_uid")
    .eq("property_id", propertyId)
    .neq("status", "cancelled")
    .lt("start_date", end)
    .gt("end_date", start)
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (rawEvents ?? []) as CalendarEventRow[];

  // ====================================================================
  // Enrichissement : pour chaque event Dashify (booking / quote_hold),
  // on récupère customer_name + booking_id / quote_id.
  //
  // Stratégie :
  //   1. Parser external_uid pour identifier les events à enrichir
  //   2. Batch fetch bookings + quotes (2 queries max au total)
  //   3. Batch fetch customers (1 query) à partir des customer_id collectés
  //   4. Mapper le résultat
  //
  // Coût : 3 queries supplémentaires max, indépendamment du nombre d'events.
  // ====================================================================

  const bookingIds = new Set<string>();
  const quoteIds = new Set<string>();
  const parsedByEventId = new Map<string, ReturnType<typeof parseExternalUid>>();

  for (const ev of events) {
    const parsed = parseExternalUid(ev.external_uid);
    parsedByEventId.set(ev.id, parsed);
    if (!parsed) continue;
    if (parsed.kind === "booking") bookingIds.add(parsed.id);
    if (parsed.kind === "quote") quoteIds.add(parsed.id);
  }

  // Maps pour résolution rapide
  const bookingToCustomer = new Map<string, string | null>(); // booking_id -> customer_id
  const quoteToCustomer = new Map<string, string | null>(); // quote_id -> customer_id
  const customerIds = new Set<string>();

  // Fetch bookings (uniquement si on en a)
  if (bookingIds.size > 0) {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, customer_id")
      .in("id", Array.from(bookingIds));

    if (bookingsError) {
      // On log mais on n'échoue pas — l'UI affichera un placeholder
      console.error("[/api/calendar/events] bookings fetch error:", bookingsError.message);
    } else {
      for (const b of bookingsData ?? []) {
        bookingToCustomer.set(b.id, b.customer_id ?? null);
        if (b.customer_id) customerIds.add(b.customer_id);
      }
    }
  }

  // Fetch quotes (uniquement si on en a)
  if (quoteIds.size > 0) {
    const { data: quotesData, error: quotesError } = await supabase
      .from("quotes")
      .select("id, customer_id")
      .in("id", Array.from(quoteIds));

    if (quotesError) {
      console.error("[/api/calendar/events] quotes fetch error:", quotesError.message);
    } else {
      for (const q of quotesData ?? []) {
        quoteToCustomer.set(q.id, q.customer_id ?? null);
        if (q.customer_id) customerIds.add(q.customer_id);
      }
    }
  }

  // Fetch customers (1 seule query pour tous)
  const customerNameById = new Map<string, string>();
  if (customerIds.size > 0) {
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", Array.from(customerIds));

    if (customersError) {
      console.error("[/api/calendar/events] customers fetch error:", customersError.message);
    } else {
      for (const c of customersData ?? []) {
        if (c.name) customerNameById.set(c.id, c.name);
      }
    }
  }

  // Construction du résultat enrichi
  const enriched: EnrichedCalendarEvent[] = events.map((ev) => {
    const parsed = parsedByEventId.get(ev.id) ?? null;

    let booking_id: string | null = null;
    let quote_id: string | null = null;
    let customer_name: string | null = null;

    if (parsed?.kind === "booking") {
      booking_id = parsed.id;
      const customerId = bookingToCustomer.get(parsed.id) ?? null;
      if (customerId) customer_name = customerNameById.get(customerId) ?? null;
    } else if (parsed?.kind === "quote") {
      quote_id = parsed.id;
      const customerId = quoteToCustomer.get(parsed.id) ?? null;
      if (customerId) customer_name = customerNameById.get(customerId) ?? null;
    }

    return {
      ...ev,
      booking_id,
      quote_id,
      customer_name,
    };
  });

  return NextResponse.json({ events: enriched });
}