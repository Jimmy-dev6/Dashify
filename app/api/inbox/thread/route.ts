import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = (searchParams.get("customerId") ?? "").trim();
  const propertyIdRaw = searchParams.get("propertyId");
  const propertyId =
    propertyIdRaw === null || propertyIdRaw === "" ? null : propertyIdRaw.trim() || null;
  const platform = (searchParams.get("platform") ?? "").trim().toLowerCase();

  if (!customerId || !platform) {
    return NextResponse.json(
      { error: "Paramètres requis: customerId, platform, propertyId (optionnel)." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = supabase
    .from("messages")
    .select(
      "id,customer_id,property_id,platform,direction,content,is_read,is_note,external_url,created_at",
    )
    .eq("user_id", userData.user.id)
    .eq("customer_id", customerId)
    .eq("platform", platform)
    .order("created_at", { ascending: true });

  if (propertyId) q = q.eq("property_id", propertyId);
  else q = q.is("property_id", null);

  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}
