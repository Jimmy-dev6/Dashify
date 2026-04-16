import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeFullQuotePricing } from "@/lib/pricing/full-quote-pricing";

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = (searchParams.get("propertyId") ?? "").trim();
  const checkIn = (searchParams.get("checkIn") ?? "").trim();
  const checkOut = (searchParams.get("checkOut") ?? "").trim();
  const guests = Math.max(1, Math.min(50, Math.round(Number(searchParams.get("guests") ?? "2"))));
  const promoCode = (searchParams.get("promoCode") ?? "").trim() || null;
  const supRaw = (searchParams.get("supplements") ?? "").trim();
  const supplementIds = supRaw ? supRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!propertyId || !isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return NextResponse.json(
      { error: "Paramètres requis: propertyId, checkIn, checkOut (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  if (checkIn >= checkOut) {
    return NextResponse.json({ error: "check-out doit être après check-in." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await computeFullQuotePricing(supabase, user.id, {
    propertyId,
    checkIn,
    checkOut,
    guests,
    promoCode,
    supplementIds,
    promoReferenceDate: new Date(),
  });

  if (!full.ok) {
    return NextResponse.json({ error: full.error }, { status: full.status });
  }

  const p = full.data.lodgingPreview;

  return NextResponse.json({
    ...p,
    grand_total: full.data.grandTotal,
    fee_lines: full.data.feeLines,
    fee_total: full.data.feeTotal,
    supplement_lines: full.data.supplementLines,
    supplement_total: full.data.supplementTotal,
    promotion: full.data.promotion,
    subtotal_before_promo: full.data.subtotalBeforePromo,
    base_price: full.data.propertyBasePrice,
    cleaning_fee: full.data.propertyCleaningFee,
  });
}
