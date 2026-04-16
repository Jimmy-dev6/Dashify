import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchIcsBody } from "@/lib/ical/sync-channel";
import { parseIcsEvents } from "@/lib/ical/parse-ics";

type Body = { url?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "URL requise." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const text = await fetchIcsBody(url);
    const events = parseIcsEvents(text);
    return NextResponse.json({
      ok: true,
      eventCount: events.length,
      confirmedCount: events.filter((e) => !e.cancelledInFeed).length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
