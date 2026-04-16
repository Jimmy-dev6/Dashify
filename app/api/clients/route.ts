import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  booking_count: number;
  total_spent_xof: number;
  last_booking_at: string | null;
};

function monthBoundsUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), next: next.toISOString() };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = searchParams.get("sort") ?? "name";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customersRaw, error: cErr } = await supabase
    .from("customers")
    .select("id,name,phone,email,source,notes,created_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const customers = (customersRaw ?? []) as Omit<
    ClientRow,
    "booking_count" | "total_spent_xof" | "last_booking_at"
  >[];

  const { data: bookingsRaw, error: bErr } = await supabase
    .from("bookings")
    .select("customer_id,total,status,check_in")
    .eq("user_id", user.id);

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  const bookings = (bookingsRaw ?? []) as {
    customer_id: string;
    total: number;
    status: string;
    check_in: string;
  }[];

  const byCustomer = new Map<
    string,
    { count: number; spent: number; last: string | null }
  >();

  for (const b of bookings) {
    const cid = b.customer_id;
    if (!byCustomer.has(cid)) {
      byCustomer.set(cid, { count: 0, spent: 0, last: null });
    }
    const agg = byCustomer.get(cid)!;
    agg.count += 1;
    if (b.status !== "cancelled") {
      agg.spent += Number(b.total ?? 0);
      if (!agg.last || b.check_in > agg.last) agg.last = b.check_in;
    }
  }

  const { start: monthStart, next: monthNext } = monthBoundsUtc();
  let clientsThisMonth = 0;
  for (const c of customers) {
    const ca = new Date(c.created_at).toISOString();
    if (ca >= monthStart && ca < monthNext) clientsThisMonth += 1;
  }

  let totalRevenue = 0;
  for (const b of bookings) {
    if (b.status !== "cancelled") totalRevenue += Number(b.total ?? 0);
  }

  let enriched: ClientRow[] = customers.map((c) => {
    const agg = byCustomer.get(c.id) ?? { count: 0, spent: 0, last: null };
    return {
      ...c,
      email: c.email ?? null,
      source: c.source ?? "direct",
      notes: c.notes ?? null,
      booking_count: agg.count,
      total_spent_xof: Math.round(agg.spent),
      last_booking_at: agg.last,
    };
  });

  if (q) {
    enriched = enriched.filter((c) => {
      const name = c.name.toLowerCase();
      const phone = c.phone.toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }

  enriched.sort((a, b) => {
    let cmp = 0;
    if (sort === "last_booking") {
      const da = a.last_booking_at ?? "";
      const db = b.last_booking_at ?? "";
      cmp = da.localeCompare(db);
    } else if (sort === "total_spent") {
      cmp = a.total_spent_xof - b.total_spent_xof;
    } else {
      cmp = a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    }
    return order === "desc" ? -cmp : cmp;
  });

  return NextResponse.json({
    clients: enriched,
    stats: {
      totalClients: customers.length,
      clientsThisMonth,
      totalRevenueClients: Math.round(totalRevenue),
    },
  });
}

type PostBody = {
  name?: string;
  phone?: string;
  email?: string | null;
  source?: string;
  notes?: string | null;
};

function isValidInternationalPhone(phone: string) {
  const t = phone.trim();
  if (!t.startsWith("+")) return false;
  const digits = t.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (!/^[1-9]/.test(digits)) return false;
  return /^\+[\d\s-]{9,}$/.test(t);
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = (body.email ?? "").trim() || null;
  const source = (body.source ?? "direct").trim();
  const notes = (body.notes ?? "").trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  if (!phone || !isValidInternationalPhone(phone)) {
    return NextResponse.json(
      { error: "Téléphone invalide : utilisez le format international (ex: +225 07 00 00 00 00)." },
      { status: 400 },
    );
  }
  if (!["airbnb", "booking", "direct"].includes(source)) {
    return NextResponse.json({ error: "Source invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name,
      phone,
      email,
      source,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
