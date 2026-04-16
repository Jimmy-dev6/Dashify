import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAvailability } from "@/lib/availability";

function parseMonth(value: string | null) {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function toIsoLocal(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseIsoDate(s: string) {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, m - 1, d);
}

function nightsBetweenInclusiveStartExclusiveEnd(checkIn: string, checkOut: string) {
  const a = parseIsoDate(checkIn);
  const b = parseIsoDate(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

function overlapNightsInMonth(
  checkIn: string,
  checkOut: string,
  monthStartIso: string,
  monthEndExclusiveIso: string,
) {
  const s = parseIsoDate(checkIn);
  const e = parseIsoDate(checkOut);
  const ms = parseIsoDate(monthStartIso);
  const me = parseIsoDate(monthEndExclusiveIso);
  const segStart = s > ms ? s : ms;
  const segEnd = e < me ? e : me;
  if (segStart >= segEnd) return 0;
  return Math.round((segEnd.getTime() - segStart.getTime()) / (24 * 60 * 60 * 1000));
}

export type BookingRow = {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total: number;
  status: string;
  created_at: string;
  customer: { id: string; name: string; phone: string } | null;
  property: {
    id: string;
    name: string;
    currency: string | null;
  } | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = parseMonth(searchParams.get("month"));
  const propertyId = searchParams.get("propertyId");
  const status = searchParams.get("status");

  if (!month) {
    return NextResponse.json({ error: "Paramètre month=YYYY-MM requis." }, { status: 400 });
  }

  const monthStart = toIsoLocal(month.year, month.monthIndex + 1, 1);
  const monthEndExclusive = toIsoLocal(month.year, month.monthIndex + 2, 1);
  const dim = daysInMonth(month.year, month.monthIndex);

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = supabase
    .from("bookings")
    .select(
      "id,check_in,check_out,guests,total,status,created_at,customer:customers(id,name,phone),property:properties(id,name,currency)",
    )
    .eq("user_id", user.id)
    .lt("check_in", monthEndExclusive)
    .gt("check_out", monthStart)
    .order("check_in", { ascending: false });

  if (propertyId) q = q.eq("property_id", propertyId);
  if (status && (status === "confirmed" || status === "cancelled" || status === "completed")) {
    q = q.eq("status", status);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const raw = (data ?? []) as unknown as BookingRow[];
  const bookings = raw.map((row) => ({
    ...row,
    customer: Array.isArray(row.customer)
      ? (row.customer[0] ?? null)
      : row.customer,
    property: Array.isArray(row.property)
      ? (row.property[0] ?? null)
      : row.property,
  }));

  const { count: propertyCountRaw } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const propertyCount = Math.max(1, propertyCountRaw ?? 1);

  let bookedNightsActive = 0;
  let revenue = 0;
  for (const b of bookings) {
    const n = overlapNightsInMonth(b.check_in, b.check_out, monthStart, monthEndExclusive);
    if (b.status === "confirmed" || b.status === "completed") {
      bookedNightsActive += n;
      revenue += Number(b.total ?? 0);
    }
  }

  const denom = dim * (propertyId ? 1 : propertyCount);
  const occupancyPct =
    denom > 0 ? Math.min(100, Math.round((bookedNightsActive / denom) * 1000) / 10) : 0;

  const list = bookings.map((b) => ({
    ...b,
    nights: nightsBetweenInclusiveStartExclusiveEnd(b.check_in, b.check_out),
  }));

  return NextResponse.json({
    bookings: list,
    stats: {
      totalBookings: bookings.length,
      revenueMonth: revenue,
      occupancyPct,
      monthStart,
      monthEndExclusive: monthEndExclusive,
      daysInMonth: dim,
      propertyCountUsed: propertyId ? 1 : propertyCount,
    },
  });
}

type PostBody = {
  /** Si true + quoteId : crée la réservation à partir d’un devis accepté (dates & total du devis). */
  fromAcceptedQuote?: boolean;
  propertyId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number;
  quoteId?: string | null;
};

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let propertyId = body.propertyId as string | undefined;
  let checkIn = body.checkIn as string | undefined;
  let checkOut = body.checkOut as string | undefined;
  let guests = Number(body.guests ?? 1);
  let total = Number(body.total ?? 0);
  let customerIdPrefill: string | null = null;

  if (body.fromAcceptedQuote) {
    const qid = typeof body.quoteId === "string" ? body.quoteId : null;
    if (!qid) {
      return NextResponse.json(
        { error: "fromAcceptedQuote requiert quoteId." },
        { status: 400 },
      );
    }
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("id,property_id,customer_id,check_in,check_out,guests,total,status")
      .eq("id", qid)
      .eq("user_id", user.id)
      .maybeSingle();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }
    if (quote.status !== "accepted") {
      return NextResponse.json(
        { error: "Seuls les devis au statut « accepté » peuvent être convertis." },
        { status: 400 },
      );
    }
    propertyId = quote.property_id;
    checkIn = quote.check_in;
    checkOut = quote.check_out;
    guests = Number(quote.guests ?? 1);
    total = Number(quote.total ?? 0);
    customerIdPrefill = quote.customer_id;
  }

  if (!propertyId || !isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return NextResponse.json(
      { error: "Champs requis: propertyId, checkIn, checkOut (ou fromAcceptedQuote + quoteId)." },
      { status: 400 },
    );
  }

  if (checkIn >= checkOut) {
    return NextResponse.json(
      { error: "La date de départ doit être après la date d’arrivée." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(guests) || guests < 1 || guests > 50) {
    return NextResponse.json({ error: "Nombre de voyageurs invalide." }, { status: 400 });
  }

  if (!Number.isFinite(total) || total < 0) {
    return NextResponse.json({ error: "Total invalide." }, { status: 400 });
  }

  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("id,user_id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (propErr || !prop) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const conflicts = await checkAvailability(supabase, { propertyId, checkIn, checkOut });
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Indisponible sur ces dates (conflit avec une autre réservation ou import calendrier).",
        conflicts,
      },
      { status: 409 },
    );
  }

  let customerId = customerIdPrefill ?? ((body.customerId ?? null) as string | null);
  const customerName = (body.customerName ?? "").trim();
  const customerPhone = (body.customerPhone ?? "").trim();

  if (!customerId) {
    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Sélectionnez un client ou renseignez nom + téléphone." },
        { status: 400 },
      );
    }

    const { data: insertedCustomer, error: insertCustomerError } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: customerName,
        phone: customerPhone,
      })
      .select("id")
      .single();

    if (insertCustomerError || !insertedCustomer) {
      return NextResponse.json(
        { error: insertCustomerError?.message ?? "Erreur création client." },
        { status: 500 },
      );
    }

    customerId = insertedCustomer.id;
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    property_id: propertyId,
    customer_id: customerId,
    check_in: checkIn,
    check_out: checkOut,
    guests,
    total,
    status: "confirmed",
  };

  const { data: booking, error: insertErr } = await supabase
    .from("bookings")
    .insert(insertPayload as never)
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // calendar_events : créé automatiquement par trigger trg_booking_calendar (source dashify).
  return NextResponse.json({ ok: true, id: booking?.id });
}
