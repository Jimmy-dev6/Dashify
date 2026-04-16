import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRICE_TYPES = ["per_stay", "per_night", "per_person"] as const;

function validPriceType(t: string): t is (typeof PRICE_TYPES)[number] {
  return (PRICE_TYPES as readonly string[]).includes(t);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = (searchParams.get("propertyId") ?? "").trim();

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let q = supabase
    .from("supplements")
    .select("*,property:properties(id,name)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (propertyId) {
    q = q.or(`property_id.is.null,property_id.eq.${propertyId}`);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplements: data ?? [] });
}

type PostBody = {
  name?: string;
  description?: string;
  propertyId?: string | null;
  price?: number;
  priceType?: string;
  isOptional?: boolean;
  icon?: string | null;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const priceType = (body.priceType ?? "per_stay").toLowerCase();
  if (!validPriceType(priceType)) {
    return NextResponse.json({ error: "Type de prix invalide." }, { status: 400 });
  }

  const price = Number(body.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let propertyId: string | null = null;
  const rawPid = body.propertyId;
  if (rawPid != null && String(rawPid).trim() !== "") {
    const pid = String(rawPid).trim();
    const { data: prop } = await supabase
      .from("properties")
      .select("id")
      .eq("id", pid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!prop) return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    propertyId = pid;
  }

  const { data, error } = await supabase
    .from("supplements")
    .insert({
      user_id: user.id,
      property_id: propertyId,
      name,
      description: (body.description ?? "").trim(),
      price,
      price_type: priceType,
      is_optional: body.isOptional !== false,
      icon: body.icon?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
