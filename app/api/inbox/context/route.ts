import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StayRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = (searchParams.get("customerId") ?? "").trim();
  const propertyIdRaw = searchParams.get("propertyId");
  const propertyId =
    propertyIdRaw === null || propertyIdRaw === "" ? null : propertyIdRaw.trim() || null;

  if (!customerId) {
    return NextResponse.json({ error: "customerId requis." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id,name,phone,email,source,notes")
    .eq("id", customerId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (cErr || !customer) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  let property: { id: string; name: string } | null = null;
  if (propertyId) {
    const { data: prop, error: pErr } = await supabase
      .from("properties")
      .select("id,name")
      .eq("id", propertyId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!pErr && prop) property = prop as { id: string; name: string };
  }

  let booking: StayRow | null = null;

  let quote: StayRow | null = null;

  if (propertyId) {
    const { data: b } = await supabase
      .from("bookings")
      .select("id,check_in,check_out,status,total")
      .eq("user_id", userData.user.id)
      .eq("customer_id", customerId)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (b) booking = b as StayRow;

    const { data: q } = await supabase
      .from("quotes")
      .select("id,check_in,check_out,status,total")
      .eq("user_id", userData.user.id)
      .eq("customer_id", customerId)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (q) quote = q as StayRow;
  } else {
    const { data: b } = await supabase
      .from("bookings")
      .select("id,check_in,check_out,status,total")
      .eq("user_id", userData.user.id)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (b) booking = b as StayRow;

    const { data: q } = await supabase
      .from("quotes")
      .select("id,check_in,check_out,status,total")
      .eq("user_id", userData.user.id)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (q) quote = q as StayRow;
  }

  return NextResponse.json({ customer, property, booking, quote });
}
