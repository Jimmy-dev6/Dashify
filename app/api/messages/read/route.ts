import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  customerId?: string;
  propertyId?: string | null;
  platform?: string;
};

export async function PATCH(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const customerId = (body.customerId ?? "").trim();
  const propertyId = body.propertyId != null ? String(body.propertyId).trim() || null : null;
  const platform = (body.platform ?? "").trim().toLowerCase();

  if (!customerId || !platform) {
    return NextResponse.json({ error: "customerId et platform requis." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = supabase
    .from("messages")
    .update({ is_read: true } as never)
    .eq("user_id", userData.user.id)
    .eq("customer_id", customerId)
    .eq("platform", platform)
    .eq("direction", "inbound")
    .eq("is_read", false);

  if (propertyId) q = q.eq("property_id", propertyId);
  else q = q.is("property_id", null);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
