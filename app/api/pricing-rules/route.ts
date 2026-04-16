import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMonthDailyPrices, rulesFromRow } from "@/lib/pricing/compute";
import { fetchOccupancyPercentForMonth } from "@/lib/pricing/occupancy";
import { loadMergedPricingEventWindows } from "@/lib/pricing/load-merged-events";
import {
  computeQualityMultiplierFromAmenities,
  computeQualityStars,
  normalizeAmenities,
  starsToQualityMultiplier,
} from "@/lib/pricing/amenities";
import type { SeasonRule } from "@/lib/pricing/types";

function parseMonthKey(s: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (!Number.isFinite(y) || mo < 0 || mo > 11) return null;
  return { y, m0: mo };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const withStats = searchParams.get("withStats") === "1";
  const monthKey = (searchParams.get("month") ?? "").trim();
  const monthParsed = parseMonthKey(monthKey);

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: props, error: pErr } = await supabase
    .from("properties")
    .select(
      "id,name,base_price,cleaning_fee,currency,city,amenities,neighborhood,competitor_avg_price,quality_score",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const ids = (props ?? []).map((p) => (p as { id: string }).id);
  if (ids.length === 0) {
    return NextResponse.json({ properties: [] });
  }

  const { data: rulesRows, error: rErr } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("user_id", user.id)
    .in("property_id", ids);

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const byProp = new Map<string, Record<string, unknown>>();
  for (const r of rulesRows ?? []) {
    const row = r as Record<string, unknown>;
    byProp.set(String(row.property_id), row);
  }

  const properties = (props ?? []).map((p) => {
    const row = p as Record<string, unknown>;
    const id = String(row.id);
    const rulesRaw = byProp.get(id) ?? null;
    const rules = rulesRaw ? rulesFromRow(rulesRaw) : null;
    return {
      id,
      name: String(row.name ?? ""),
      base_price: Number(row.base_price ?? 0),
      cleaning_fee: Number(row.cleaning_fee ?? 0),
      currency: String(row.currency ?? "XOF"),
      city: row.city != null ? String(row.city) : null,
      amenities: row.amenities ?? [],
      neighborhood: row.neighborhood != null ? String(row.neighborhood) : null,
      competitor_avg_price:
        row.competitor_avg_price != null ? Number(row.competitor_avg_price) : null,
      quality_score: row.quality_score != null ? Number(row.quality_score) : null,
      rules,
    };
  });

  if (withStats && monthParsed) {
    const mk = monthKey.trim();
    for (const p of properties) {
      const base = p.base_price;
      if (!p.rules || !p.rules.is_active) {
        (p as { stats?: { min: number; max: number; avg: number } }).stats = {
          min: base,
          max: base,
          avg: base,
        };
        continue;
      }
      const occ = await fetchOccupancyPercentForMonth(supabase, p.id, mk);
      const years = [monthParsed.y - 1, monthParsed.y, monthParsed.y + 1];
      const localEvents = await loadMergedPricingEventWindows(supabase, user.id, {
        years,
        propertyCity: p.city,
        propertyCountry: "SN",
        useBuiltin: true,
        enabled: p.rules.use_local_events,
      });
      const qualityMult = computeQualityMultiplierFromAmenities(normalizeAmenities(p.amenities));
      const { min, max, avg } = buildMonthDailyPrices(
        base,
        p.rules,
        { [mk]: occ },
        monthParsed.y,
        monthParsed.m0,
        {
          qualityMult,
          localEvents,
          propertyCountry: "SN",
          propertyCity: p.city,
          currency: p.currency,
          referenceDate: new Date(),
        },
      );
      (p as { stats?: { min: number; max: number; avg: number } }).stats = { min, max, avg };
    }
  }

  return NextResponse.json({ properties });
}

type PatchBody = {
  propertyId?: string;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
  weekend_multiplier?: number;
  lastminute_days?: number;
  lastminute_discount?: number;
  high_occupancy_threshold?: number;
  high_occupancy_multiplier?: number;
  low_occupancy_threshold?: number;
  low_occupancy_multiplier?: number;
  seasons?: SeasonRule[];
  long_stay_7_discount?: number;
  long_stay_14_discount?: number;
  long_stay_30_discount?: number;
  early_bird_days?: number;
  early_bird_multiplier?: number;
  use_local_events?: boolean;
  quality_multiplier?: number;
  amenities?: unknown;
  neighborhood?: string | null;
  competitor_avg_price?: number | null;
  city?: string | null;
};

export async function PATCH(req: Request) {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const propertyId = (body.propertyId ?? "").trim();
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId requis." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id,base_price")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !prop) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const bp = Number((prop as { base_price?: number }).base_price ?? 0);
  const defMin = Math.round(bp * 0.65 * 100) / 100;
  const defMax = Math.round(bp * 1.85 * 100) / 100;

  const { data: existing } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const base = (existing as Record<string, unknown> | null) ?? {};
  const merged: Record<string, unknown> = {
    property_id: propertyId,
    user_id: user.id,
    is_active: base.is_active ?? false,
    min_price: Number(base.min_price ?? defMin),
    max_price: Number(base.max_price ?? defMax),
    weekend_multiplier: Number(base.weekend_multiplier ?? 1.2),
    lastminute_days: Number(base.lastminute_days ?? 3),
    lastminute_discount: Number(base.lastminute_discount ?? 0.85),
    high_occupancy_threshold: Number(base.high_occupancy_threshold ?? 80),
    high_occupancy_multiplier: Number(base.high_occupancy_multiplier ?? 1.1),
    low_occupancy_threshold: Number(base.low_occupancy_threshold ?? 30),
    low_occupancy_multiplier: Number(base.low_occupancy_multiplier ?? 0.9),
    seasons: base.seasons ?? [],
    long_stay_7_discount: Number(base.long_stay_7_discount ?? 0.1),
    long_stay_14_discount: Number(base.long_stay_14_discount ?? 0.15),
    long_stay_30_discount: Number(base.long_stay_30_discount ?? 0.25),
    early_bird_days: Math.max(0, Math.round(Number(base.early_bird_days ?? 90))),
    early_bird_multiplier: Number(base.early_bird_multiplier ?? 1.1),
    quality_multiplier: Number(base.quality_multiplier ?? 1),
    use_local_events: Boolean(base.use_local_events),
  };

  if (body.is_active !== undefined) merged.is_active = Boolean(body.is_active);
  if (body.min_price !== undefined) merged.min_price = Number(body.min_price);
  if (body.max_price !== undefined) merged.max_price = Number(body.max_price);
  if (body.weekend_multiplier !== undefined) {
    merged.weekend_multiplier = Number(body.weekend_multiplier);
  }
  if (body.lastminute_days !== undefined) merged.lastminute_days = Math.round(Number(body.lastminute_days));
  if (body.lastminute_discount !== undefined) {
    merged.lastminute_discount = Number(body.lastminute_discount);
  }
  if (body.high_occupancy_threshold !== undefined) {
    merged.high_occupancy_threshold = Math.round(Number(body.high_occupancy_threshold));
  }
  if (body.high_occupancy_multiplier !== undefined) {
    merged.high_occupancy_multiplier = Number(body.high_occupancy_multiplier);
  }
  if (body.low_occupancy_threshold !== undefined) {
    merged.low_occupancy_threshold = Math.round(Number(body.low_occupancy_threshold));
  }
  if (body.low_occupancy_multiplier !== undefined) {
    merged.low_occupancy_multiplier = Number(body.low_occupancy_multiplier);
  }
  if (body.seasons !== undefined) merged.seasons = body.seasons;
  if (body.long_stay_7_discount !== undefined) {
    merged.long_stay_7_discount = Number(body.long_stay_7_discount);
  }
  if (body.long_stay_14_discount !== undefined) {
    merged.long_stay_14_discount = Number(body.long_stay_14_discount);
  }
  if (body.long_stay_30_discount !== undefined) {
    merged.long_stay_30_discount = Number(body.long_stay_30_discount);
  }
  if (body.early_bird_days !== undefined) {
    merged.early_bird_days = Math.max(0, Math.round(Number(body.early_bird_days)));
  }
  if (body.early_bird_multiplier !== undefined) {
    merged.early_bird_multiplier = Number(body.early_bird_multiplier);
  }
  if (body.use_local_events !== undefined) merged.use_local_events = Boolean(body.use_local_events);
  if (body.quality_multiplier !== undefined) {
    merged.quality_multiplier = Number(body.quality_multiplier);
  }

  if (body.amenities !== undefined) {
    const ids = normalizeAmenities(body.amenities);
    const stars = computeQualityStars(ids);
    merged.quality_multiplier = starsToQualityMultiplier(stars);
  }

  const minP = Number(merged.min_price);
  const maxP = Number(merged.max_price);
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || minP < 0 || maxP < 0 || minP > maxP) {
    return NextResponse.json({ error: "min_price / max_price invalides." }, { status: 400 });
  }

  const existingId = (existing as { id?: string } | null)?.id;

  const rowPayload = {
    is_active: Boolean(merged.is_active),
    min_price: merged.min_price,
    max_price: merged.max_price,
    weekend_multiplier: merged.weekend_multiplier,
    lastminute_days: merged.lastminute_days,
    lastminute_discount: merged.lastminute_discount,
    high_occupancy_threshold: merged.high_occupancy_threshold,
    high_occupancy_multiplier: merged.high_occupancy_multiplier,
    low_occupancy_threshold: merged.low_occupancy_threshold,
    low_occupancy_multiplier: merged.low_occupancy_multiplier,
    seasons: merged.seasons,
    long_stay_7_discount: merged.long_stay_7_discount,
    long_stay_14_discount: merged.long_stay_14_discount,
    long_stay_30_discount: merged.long_stay_30_discount,
    early_bird_days: merged.early_bird_days,
    early_bird_multiplier: merged.early_bird_multiplier,
    quality_multiplier: merged.quality_multiplier,
    use_local_events: merged.use_local_events,
  };

  let error: { message: string } | null = null;
  if (existingId) {
    const out = await supabase
      .from("pricing_rules")
      .update(rowPayload)
      .eq("id", existingId)
      .eq("user_id", user.id);
    error = out.error;
  } else {
    const out = await supabase.from("pricing_rules").insert({
      property_id: propertyId,
      user_id: user.id,
      ...rowPayload,
    });
    error = out.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propUpdate: Record<string, unknown> = {};
  if (body.amenities !== undefined) {
    const ids = normalizeAmenities(body.amenities);
    propUpdate.amenities = ids;
    propUpdate.quality_score = computeQualityStars(ids);
  }
  if (body.neighborhood !== undefined) propUpdate.neighborhood = body.neighborhood;
  if (body.competitor_avg_price !== undefined) {
    propUpdate.competitor_avg_price = body.competitor_avg_price;
  }
  if (body.city !== undefined) propUpdate.city = body.city;

  if (Object.keys(propUpdate).length > 0) {
    const pu = await supabase
      .from("properties")
      .update(propUpdate)
      .eq("id", propertyId)
      .eq("user_id", user.id);
    if (pu.error) return NextResponse.json({ error: pu.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
