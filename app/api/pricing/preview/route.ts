import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMonthDailyPrices, rulesFromRow } from "@/lib/pricing/compute";
import { fetchOccupancyPercentForMonth } from "@/lib/pricing/occupancy";
import { loadMergedPricingEventWindows } from "@/lib/pricing/load-merged-events";
import { computeQualityMultiplierFromAmenities, normalizeAmenities } from "@/lib/pricing/amenities";

function parseMonth(s: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (!Number.isFinite(y) || mo < 0 || mo > 11) return null;
  return { y, m0: mo };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = (searchParams.get("propertyId") ?? "").trim();
  const month = (searchParams.get("month") ?? "").trim();

  const parsed = parseMonth(month);
  if (!propertyId || !parsed) {
    return NextResponse.json(
      { error: "Paramètres requis: propertyId, month (YYYY-MM)." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id,base_price,currency,city,amenities")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !prop) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const pr = prop as {
    base_price?: number;
    city?: string | null;
    amenities?: unknown;
  };
  const basePrice = Number(pr.base_price ?? 0);
  const cur = String((pr as { currency?: string }).currency ?? "XOF");
  const propertyCity = pr.city != null && String(pr.city).trim() ? String(pr.city) : null;
  const propertyCountry = "SN";
  const qualityMult = computeQualityMultiplierFromAmenities(normalizeAmenities(pr.amenities));

  const { data: rulesRow } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const rulesParsed = rulesFromRow((rulesRow as Record<string, unknown> | null) ?? null);
  if (!rulesParsed || !rulesParsed.is_active) {
    const dim = new Date(parsed.y, parsed.m0 + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= dim; d++) {
      const date = `${parsed.y}-${String(parsed.m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date, price: basePrice, tier: "mid" as const });
    }
    return NextResponse.json({
      active: false,
      days,
      min: basePrice,
      max: basePrice,
      avg: basePrice,
    });
  }

  const occPct = await fetchOccupancyPercentForMonth(supabase, propertyId, month);
  const occMap = { [month]: occPct };
  const years = [parsed.y - 1, parsed.y, parsed.y + 1];
  const localEvents = await loadMergedPricingEventWindows(supabase, user.id, {
    years,
    propertyCity,
    propertyCountry,
    useBuiltin: true,
    enabled: rulesParsed.use_local_events,
  });

  const { days, min, max, avg } = buildMonthDailyPrices(
    basePrice,
    rulesParsed,
    occMap,
    parsed.y,
    parsed.m0,
    {
      qualityMult,
      localEvents,
      propertyCountry,
      propertyCity,
      currency: cur as string,
      referenceDate: new Date(),
    },
  );

  return NextResponse.json({ active: true, days, min, max, avg });
}
