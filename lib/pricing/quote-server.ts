import type { SupabaseClient } from "@supabase/supabase-js";
import { computeStayQuote, nightsBetween, rulesFromRow } from "@/lib/pricing/compute";
import { fetchOccupancyMapForMonths } from "@/lib/pricing/occupancy";
import { loadMergedPricingEventWindows } from "@/lib/pricing/load-merged-events";
import { computeQualityMultiplierFromAmenities, normalizeAmenities } from "@/lib/pricing/amenities";
import type { QuotePreviewResult } from "@/lib/pricing/types";

function monthKeysBetween(checkIn: string, checkOut: string) {
  const keys = new Set<string>();
  const [y0, m0, d0] = checkIn.split("-").map(Number);
  const end = new Date(checkOut + "T12:00:00");
  let d = new Date(y0!, (m0 ?? 1) - 1, d0 ?? 1);
  while (d < end) {
    keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
  }
  return Array.from(keys);
}

function yearsTouchingStay(checkIn: string, checkOut: string) {
  const y0 = Number(checkIn.slice(0, 4));
  const y1 = Number(checkOut.slice(0, 4));
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  const out: number[] = [];
  for (let y = lo - 1; y <= hi + 1; y++) out.push(y);
  return out;
}

export async function computeQuotePreviewForProperty(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<
  | { ok: true; result: QuotePreviewResult; base_price: number; cleaning_fee: number }
  | { ok: false; error: string; status: number }
> {
  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id,base_price,cleaning_fee,currency,city,amenities")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (pErr || !prop) {
    return { ok: false, error: "Logement introuvable.", status: 404 };
  }

  const pr = prop as {
    base_price?: number;
    cleaning_fee?: number;
    currency?: string;
    city?: string | null;
    amenities?: unknown;
  };
  const basePrice = Number(pr.base_price ?? 0);
  const cleaningFee = Number(pr.cleaning_fee ?? 0);
  const currency = String(pr.currency ?? "XOF");
  const propertyCity = pr.city != null && String(pr.city).trim() ? String(pr.city) : null;
  const propertyCountry = "SN";
  const qualityMult = computeQualityMultiplierFromAmenities(normalizeAmenities(pr.amenities));

  const { data: rulesRow } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  const rules = rulesFromRow((rulesRow as Record<string, unknown> | null) ?? null);
  if (!rules || !rules.is_active) {
    const nights = nightsBetween(checkIn, checkOut);
    const total = nights * basePrice + cleaningFee;
    return {
      ok: true,
      base_price: basePrice,
      cleaning_fee: cleaningFee,
      result: {
        active: false,
        currency,
        total,
        nightly_subtotal: nights * basePrice,
        cleaning_fee: cleaningFee,
        lines: [],
        breakdown: null,
      },
    };
  }

  const months = monthKeysBetween(checkIn, checkOut);
  const occ = await fetchOccupancyMapForMonths(supabase, propertyId, months);
  const years = yearsTouchingStay(checkIn, checkOut);
  const localEvents = await loadMergedPricingEventWindows(supabase, userId, {
    years,
    propertyCity,
    propertyCountry,
    useBuiltin: true,
    enabled: rules.use_local_events,
  });

  const result = computeStayQuote({
    basePrice,
    cleaningFee,
    currency,
    checkIn,
    checkOut,
    rules,
    occupancyByMonth: occ,
    localEvents,
    propertyCountry,
    propertyCity,
    qualityMult,
  });

  return { ok: true, result, base_price: basePrice, cleaning_fee: cleaningFee };
}
