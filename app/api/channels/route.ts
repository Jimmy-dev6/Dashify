import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["airbnb", "booking", "vrbo", "expedia", "other"] as const;

function isPlatform(s: string): s is (typeof PLATFORMS)[number] {
  return (PLATFORMS as readonly string[]).includes(s);
}

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,name,property_channels(id,property_id,platform,ical_url,is_active,last_synced_at,last_error,error_count,created_at)",
    )
    .eq("user_id", userData.user.id)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const properties = (data ?? []).map((row: Record<string, unknown>) => {
    const ch = row.property_channels;
    const channels = Array.isArray(ch) ? ch : ch ? [ch] : [];
    return {
      id: row.id as string,
      name: row.name as string,
      channels: channels as Array<{
        id: string;
        property_id: string;
        platform: string;
        ical_url: string;
        is_active: boolean;
        last_synced_at: string | null;
        last_error: string | null;
        error_count: number;
        created_at: string;
      }>,
    };
  });

  return NextResponse.json({ properties });
}

type PostBody = {
  propertyId?: string;
  platform?: string;
  icalUrl?: string;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const propertyId = (body.propertyId ?? "").trim();
  const platform = (body.platform ?? "other").trim().toLowerCase();
  const icalUrl = (body.icalUrl ?? "").trim();

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId requis." }, { status: 400 });
  }
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
  }
  if (!icalUrl) {
    return NextResponse.json({ error: "URL iCal requise." }, { status: 400 });
  }
  try {
    const u = new URL(icalUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return NextResponse.json({ error: "URL invalide (http/https uniquement)." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "URL iCal invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (pErr || !prop) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("property_channels")
    .insert({
      property_id: propertyId,
      platform,
      ical_url: icalUrl,
      is_active: true,
    })
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: inserted?.id });
}
