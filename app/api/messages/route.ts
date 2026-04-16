import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["whatsapp", "airbnb", "booking", "dashify"] as const;

type PostBody = {
  customerId?: string;
  propertyId?: string | null;
  platform?: string;
  direction?: string;
  content?: string;
  external_url?: string | null;
  is_note?: boolean;
};

function isPlatform(s: string): s is (typeof PLATFORMS)[number] {
  return (PLATFORMS as readonly string[]).includes(s);
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const customerId = (body.customerId ?? "").trim();
  const propertyId = body.propertyId != null ? String(body.propertyId).trim() || null : null;
  const platform = (body.platform ?? "").trim().toLowerCase();
  const direction = (body.direction ?? "outbound").trim().toLowerCase();
  const content = (body.content ?? "").trim();
  const external_url = body.external_url != null ? String(body.external_url).trim() || null : null;
  const is_note = Boolean(body.is_note);

  console.log("[api/messages] inbound", {
    customerId,
    propertyId,
    platform,
    direction,
    contentLen: content.length,
    is_note,
  });

  if (!customerId) {
    return NextResponse.json({ error: "customerId requis." }, { status: 400 });
  }
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
  }
  if (direction !== "outbound" && direction !== "inbound") {
    return NextResponse.json({ error: "Direction invalide." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    console.log("[api/messages] unauthorized", { ms: Date.now() - startedAt });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[api/messages] authed", { user_id: userData.user.id, ms: Date.now() - startedAt });

  const { data: cust, error: cErr } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (cErr || !cust) {
    console.log("[api/messages] customer_not_found", {
      user_id: userData.user.id,
      customerId,
      error: cErr?.message ?? null,
      ms: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  if (propertyId) {
    const { data: prop, error: pErr } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (pErr || !prop) {
      console.log("[api/messages] property_not_found", {
        user_id: userData.user.id,
        propertyId,
        error: pErr?.message ?? null,
        ms: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    }
  }

  const is_read = direction === "outbound";

  const { data: row, error: insErr } = await supabase
    .from("messages")
    .insert({
      user_id: userData.user.id,
      customer_id: customerId,
      property_id: propertyId,
      platform,
      direction,
      content,
      is_read,
      external_url,
      is_note,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[api/messages] insert_error", {
      user_id: userData.user.id,
      customerId,
      propertyId,
      platform,
      direction,
      message: insErr.message,
      ms: Date.now() - startedAt,
    });
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  console.log("[api/messages] insert_ok", { id: row?.id ?? null, ms: Date.now() - startedAt });

  return NextResponse.json({ ok: true, id: row?.id });
}
