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

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, property_id, start_date, end_date, source, status")
    .eq("property_id", propertyId)
    .neq("status", "cancelled")
    .lt("start_date", end)
    .gt("end_date", start)
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

