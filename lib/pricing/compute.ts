import type {
  DailyPreviewDay,
  DayColorTier,
  PricingDetailJson,
  PricingRulesRow,
  QuotePreviewResult,
  SeasonRule,
} from "@/lib/pricing/types";
import type { PriceEventWindow } from "@/lib/pricing/event-windows";
import { multiplierForNight } from "@/lib/pricing/event-windows";

function parseIsoLocal(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function monthKeyFromIso(iso: string) {
  return iso.slice(0, 7);
}

function addDaysIso(iso: string, days: number) {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = parseIsoLocal(checkIn).getTime();
  const b = parseIsoLocal(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function startOfTodayFrom(ref: Date) {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

function toTodayIso(ref: Date) {
  const t = startOfTodayFrom(ref);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWeekendFriSatSun(iso: string) {
  const day = parseIsoLocal(iso).getDay();
  return day === 0 || day === 5 || day === 6;
}

function normalizeSeasons(raw: unknown): SeasonRule[] {
  if (!Array.isArray(raw)) return [];
  const out: SeasonRule[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const start = String(o.start ?? "").slice(0, 10);
    const end = String(o.end ?? "").slice(0, 10);
    const kind = o.kind === "low" ? "low" : "high";
    const mult = Number(o.multiplier);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    if (start > end) continue;
    if (!Number.isFinite(mult) || mult <= 0) continue;
    out.push({ start, end, kind, multiplier: mult });
  }
  return out;
}

export function rulesFromRow(row: Record<string, unknown> | null): PricingRulesRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    user_id: String(row.user_id),
    is_active: Boolean(row.is_active),
    min_price: Number(row.min_price ?? 0),
    max_price: Number(row.max_price ?? 0),
    weekend_multiplier: Number(row.weekend_multiplier ?? 1.2),
    lastminute_days: Number(row.lastminute_days ?? 3),
    lastminute_discount: Number(row.lastminute_discount ?? 0.85),
    high_occupancy_threshold: Number(row.high_occupancy_threshold ?? 80),
    high_occupancy_multiplier: Number(row.high_occupancy_multiplier ?? 1.1),
    low_occupancy_threshold: Number(row.low_occupancy_threshold ?? 30),
    low_occupancy_multiplier: Number(row.low_occupancy_multiplier ?? 0.9),
    seasons: normalizeSeasons(row.seasons),
    long_stay_7_discount: Number(row.long_stay_7_discount ?? 0.1),
    long_stay_14_discount: Number(row.long_stay_14_discount ?? 0.15),
    long_stay_30_discount: Number(row.long_stay_30_discount ?? 0.25),
    early_bird_days: Math.max(0, Math.round(Number(row.early_bird_days ?? 90))),
    early_bird_multiplier: Number(row.early_bird_multiplier ?? 1.1),
    quality_multiplier: Number(row.quality_multiplier ?? 1),
    use_local_events: Boolean(row.use_local_events),
  };
}

function seasonMultiplier(iso: string, seasons: SeasonRule[]) {
  for (const s of seasons) {
    if (iso >= s.start && iso <= s.end) return s.multiplier;
  }
  return 1;
}

function occupancyMultiplier(pct: number, rules: PricingRulesRow) {
  if (pct >= rules.high_occupancy_threshold) return rules.high_occupancy_multiplier;
  if (pct <= rules.low_occupancy_threshold) return rules.low_occupancy_multiplier;
  return 1;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function fmtMoney(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("fr-FR")} ${currency}`;
}

export type NightPriceOpts = {
  qualityMult?: number;
  localEvents?: PriceEventWindow[];
  propertyCountry?: string | null;
  propertyCity?: string | null;
};

export function computeNightPrice(
  basePrice: number,
  nightIso: string,
  rules: PricingRulesRow,
  occupancyByMonth: Record<string, number>,
  opts?: NightPriceOpts,
) {
  const qm = opts?.qualityMult != null && opts.qualityMult > 0 ? opts.qualityMult : 1;
  const { mult: em, parts: eventParts } =
    opts?.localEvents && opts.localEvents.length > 0
      ? multiplierForNight(
          nightIso,
          opts.localEvents,
          opts.propertyCountry ?? null,
          opts.propertyCity ?? null,
        )
      : { mult: 1, parts: [] as { name: string; mult: number }[] };

  const sm = seasonMultiplier(nightIso, rules.seasons);
  const wm = isWeekendFriSatSun(nightIso) ? rules.weekend_multiplier : 1;
  const mk = monthKeyFromIso(nightIso);
  const occ = occupancyByMonth[mk] ?? 0;
  const om = occupancyMultiplier(occ, rules);
  const raw = basePrice * sm * wm * om * qm * em;
  const price = clamp(raw, rules.min_price, rules.max_price);
  return { price, sm, wm, om, occ, qm, em, eventParts, rawBeforeClamp: raw };
}

export function tierFromMonthPrices(price: number, prices: number[]): "high" | "mid" | "low" {
  const sorted = [...prices].filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  if (sorted.length === 0) return "mid";
  const n = sorted.length;
  const p33 = sorted[Math.floor((n - 1) * 0.33)] ?? sorted[0]!;
  const p66 = sorted[Math.floor((n - 1) * 0.66)] ?? sorted[n - 1]!;
  if (price >= p66) return "high";
  if (price <= p33) return "low";
  return "mid";
}

function resolveColorTier(params: {
  em: number;
  wm: number;
  om: number;
  lmCell: boolean;
  rules: PricingRulesRow;
}): DayColorTier {
  if (params.lmCell) return "last_minute";
  if (params.em >= 1.4) return "event_major";
  if (params.em >= 1.2 || (params.wm > 1 && params.em > 1)) return "event_medium";
  if (params.om >= params.rules.high_occupancy_multiplier && params.om > 1) return "occupancy_high";
  if (params.om < 1 && params.om <= params.rules.low_occupancy_multiplier) return "low_price";
  return "normal";
}

function buildDayDetail(
  basePrice: number,
  currency: string,
  parts: { label: string; mult: number }[],
  final: number,
) {
  let s = `${Math.round(basePrice).toLocaleString("fr-FR")}`;
  for (const p of parts) {
    if (Math.abs(p.mult - 1) > 0.001) {
      s += ` × ${p.label}(×${String(p.mult).replace(".", ",")})`;
    }
  }
  s += ` = ${Math.round(final).toLocaleString("fr-FR")} ${currency}`;
  return s;
}

export function computeStayQuote(params: {
  basePrice: number;
  cleaningFee: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  rules: PricingRulesRow;
  occupancyByMonth: Record<string, number>;
  today?: Date;
  localEvents?: PriceEventWindow[];
  propertyCountry?: string | null;
  propertyCity?: string | null;
  qualityMult?: number;
}): QuotePreviewResult {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const currency = params.currency || "XOF";
  if (nights < 1 || !params.rules.is_active) {
    const baseTotal = nights * params.basePrice + params.cleaningFee;
    return {
      active: false,
      currency,
      total: baseTotal,
      nightly_subtotal: nights * params.basePrice,
      cleaning_fee: params.cleaningFee,
      lines: [],
      breakdown: null,
    };
  }

  const rules = params.rules;
  const nightlyPrices: number[] = [];
  const factorNotes: string[] = [];
  const qm = params.qualityMult != null && params.qualityMult > 0 ? params.qualityMult : 1;
  const nightOpts: NightPriceOpts = {
    qualityMult: qm,
    localEvents: params.localEvents,
    propertyCountry: params.propertyCountry,
    propertyCity: params.propertyCity,
  };

  let sumNightly = 0;
  for (let i = 0; i < nights; i++) {
    const iso = addDaysIso(params.checkIn, i);
    const { price, sm, wm, om, em, eventParts } = computeNightPrice(
      params.basePrice,
      iso,
      rules,
      params.occupancyByMonth,
      nightOpts,
    );
    nightlyPrices.push(price);
    sumNightly += price;
    if (sm !== 1) factorNotes.push(`× saison ${sm}`);
    if (wm !== 1) factorNotes.push(`× week-end ${wm}`);
    if (om !== 1) factorNotes.push(`× occupation ${om}`);
    if (qm !== 1) factorNotes.push(`× qualité ${qm}`);
    if (em !== 1) factorNotes.push(`× événements ${eventParts.map((e) => `${e.name}(${e.mult})`).join(" ")}`);
  }

  const uniqFactors = Array.from(new Set(factorNotes));
  const today = params.today ?? new Date();
  const t0 = startOfTodayFrom(today);
  const daysUntil = Math.floor(
    (parseIsoLocal(params.checkIn).getTime() - t0.getTime()) / (24 * 60 * 60 * 1000),
  );

  let longStayFactor = 1;
  if (nights >= 30) longStayFactor = 1 - rules.long_stay_30_discount;
  else if (nights >= 14) longStayFactor = 1 - rules.long_stay_14_discount;
  else if (nights >= 7) longStayFactor = 1 - rules.long_stay_7_discount;

  let nightlyAfterLong = sumNightly * longStayFactor;

  let earlyBirdApplied = false;
  if (daysUntil >= rules.early_bird_days && rules.early_bird_multiplier > 1) {
    nightlyAfterLong *= rules.early_bird_multiplier;
    earlyBirdApplied = true;
  }

  const lastMinute =
    daysUntil >= 0 &&
    daysUntil <= rules.lastminute_days &&
    rules.lastminute_discount > 0 &&
    rules.lastminute_discount < 1;

  let nightlyAfterLm = nightlyAfterLong;
  if (lastMinute) {
    nightlyAfterLm = nightlyAfterLong * rules.lastminute_discount;
  }

  const total = nightlyAfterLm + params.cleaningFee;
  const lines: string[] = [];

  const avgBeforeLm = nights > 0 ? sumNightly / nights : 0;
  lines.push(
    `Prix de base ${fmtMoney(params.basePrice, currency)}/nuit × ${nights} nuit${nights > 1 ? "s" : ""} (dynamique) → moyenne ${fmtMoney(avgBeforeLm, currency)}/nuit avant ajustements finaux.`,
  );
  if (uniqFactors.length) {
    lines.push(
      `Facteurs par nuit : ${uniqFactors.slice(0, 8).join(", ")}${uniqFactors.length > 8 ? "…" : ""}.`,
    );
  }
  if (longStayFactor < 1) {
    lines.push(
      `Long séjour (${nights} n.) : −${Math.round((1 - longStayFactor) * 100)} % sur le sous-total nuitées.`,
    );
  }
  if (earlyBirdApplied) {
    lines.push(
      `Early bird (≥ ${rules.early_bird_days} j. avant arrivée) : ×${rules.early_bird_multiplier}.`,
    );
  }
  if (lastMinute) {
    lines.push(
      `Last minute (≤ ${rules.lastminute_days} j. avant arrivée) : ×${rules.lastminute_discount} sur le sous-total nuitées.`,
    );
  }
  lines.push(`Ménage : ${fmtMoney(params.cleaningFee, currency)}.`);
  lines.push(`Total : ${fmtMoney(total, currency)}.`);

  const detail: PricingDetailJson = {
    currency,
    lines,
    nights_count: nights,
    nightly_subtotal: Math.round(nightlyAfterLm * 100) / 100,
    cleaning_fee: params.cleaningFee,
    last_minute_applied: lastMinute,
    total: Math.round(total * 100) / 100,
  };

  return {
    active: true,
    currency,
    total: detail.total,
    nightly_subtotal: detail.nightly_subtotal,
    cleaning_fee: params.cleaningFee,
    lines,
    breakdown: detail,
  };
}

export function buildMonthDailyPrices(
  basePrice: number,
  rules: PricingRulesRow,
  occupancyByMonth: Record<string, number>,
  year: number,
  monthIndex: number,
  opts?: {
    qualityMult?: number;
    localEvents?: PriceEventWindow[];
    propertyCountry?: string | null;
    propertyCity?: string | null;
    currency?: string;
    referenceDate?: Date;
  },
) {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const prices: number[] = [];
  const days: DailyPreviewDay[] = [];
  const ref = opts?.referenceDate ?? new Date();
  const todayIso = toTodayIso(ref);
  const cur = opts?.currency ?? "XOF";
  const nightOpts: NightPriceOpts = {
    qualityMult: opts?.qualityMult,
    localEvents: opts?.localEvents,
    propertyCountry: opts?.propertyCountry,
    propertyCity: opts?.propertyCity,
  };

  for (let d = 1; d <= dim; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const { price: p0, sm, wm, om, qm, em, eventParts } = computeNightPrice(
      basePrice,
      iso,
      rules,
      occupancyByMonth,
      nightOpts,
    );
    const daysToNight = nightsBetween(todayIso, iso);
    const lmCell =
      daysToNight >= 0 &&
      daysToNight <= rules.lastminute_days &&
      rules.lastminute_discount > 0 &&
      rules.lastminute_discount < 1;
    let p = p0;
    if (lmCell) p = clamp(p0 * rules.lastminute_discount, rules.min_price, rules.max_price);

    const detailParts: { label: string; mult: number }[] = [];
    if (Math.abs(wm - 1) > 0.001) detailParts.push({ label: "week-end", mult: wm });
    if (Math.abs(sm - 1) > 0.001) detailParts.push({ label: "saison", mult: sm });
    if (Math.abs(om - 1) > 0.001) detailParts.push({ label: "occupation", mult: om });
    if (Math.abs(qm - 1) > 0.001) detailParts.push({ label: "qualité", mult: qm });
    for (const ep of eventParts) detailParts.push({ label: ep.name, mult: ep.mult });
    if (lmCell) detailParts.push({ label: "last minute", mult: rules.lastminute_discount });

    const detail = buildDayDetail(basePrice, cur, detailParts, p);
    const color_tier = resolveColorTier({ em, wm, om, lmCell, rules });

    prices.push(p);
    days.push({
      date: iso,
      price: p,
      tier: "mid",
      detail,
      color_tier,
    });
  }

  for (const day of days) {
    day.tier = tierFromMonthPrices(day.price, prices);
  }

  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  return { days, min, max, avg };
}
