import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DISCOUNT_TYPES = ["percent", "fixed"] as const;

function validDiscountType(t: string): t is (typeof DISCOUNT_TYPES)[number] {
  return (DISCOUNT_TYPES as readonly string[]).includes(t);
}

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promotions: data ?? [] });
}

type PostBody = {
  code?: string;
  name?: string;
  discountType?: string;
  discountValue?: number;
  minNights?: number;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code || code.length < 2) return NextResponse.json({ error: "Code promo requis." }, { status: 400 });

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom interne requis." }, { status: 400 });

  const discountType = (body.discountType ?? "percent").toLowerCase();
  if (!validDiscountType(discountType)) {
    return NextResponse.json({ error: "Type de réduction invalide." }, { status: 400 });
  }

  const discountValue = Number(body.discountValue ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: "Valeur de réduction invalide." }, { status: 400 });
  }
  if (discountType === "percent" && discountValue > 100) {
    return NextResponse.json({ error: "Pourcentage max 100." }, { status: 400 });
  }

  const minNights = Math.max(1, Math.round(Number(body.minNights ?? 1)));
  const maxUses =
    body.maxUses === null || body.maxUses === undefined || String(body.maxUses) === ""
      ? null
      : Math.max(1, Math.round(Number(body.maxUses)));

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("promotions")
    .insert({
      user_id: user.id,
      code,
      name,
      discount_type: discountType,
      discount_value: discountValue,
      min_nights: minNights,
      max_uses: maxUses,
      valid_from: body.validFrom?.trim() || null,
      valid_until: body.validUntil?.trim() || null,
      is_active: body.isActive !== false,
    })
    .select("id")
    .single();

  if (error) {
    if (String(error.message).toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "Ce code promo existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
