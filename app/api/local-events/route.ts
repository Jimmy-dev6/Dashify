import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("local_events")
    .select("*")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

type PostBody = {
  name?: string;
  country?: string;
  city?: string | null;
  start_date?: string;
  end_date?: string;
  impact_multiplier?: number;
  is_recurring?: boolean;
  recurrence_type?: string;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const country = (body.country ?? "SN").trim() || "SN";
  const city = body.city != null && String(body.city).trim() ? String(body.city).trim() : null;
  const start = String(body.start_date ?? "").slice(0, 10);
  const end = String(body.end_date ?? "").slice(0, 10);
  const mult = Number(body.impact_multiplier ?? 1);
  const isRecurring = Boolean(body.is_recurring);
  let recurrence = (body.recurrence_type ?? "none").trim().toLowerCase() || "none";

  if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  if (!isIsoDate(start) || !isIsoDate(end) || start > end) {
    return NextResponse.json({ error: "Dates début / fin invalides." }, { status: 400 });
  }
  if (!Number.isFinite(mult) || mult < 1 || mult > 2) {
    return NextResponse.json({ error: "Multiplicateur entre ×1,0 et ×2,0." }, { status: 400 });
  }

  if (isRecurring && recurrence !== "yearly" && !/^islamic:\d{1,2}:\d{1,2}$/.test(recurrence)) {
    recurrence = "yearly";
  }
  if (!isRecurring) recurrence = "none";

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("local_events")
    .insert({
      user_id: user.id,
      name,
      country,
      city,
      start_date: start,
      end_date: end,
      impact_multiplier: mult,
      is_recurring: isRecurring,
      recurrence_type: recurrence,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
