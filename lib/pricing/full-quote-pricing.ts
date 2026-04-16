import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuotePreviewResult } from "@/lib/pricing/types";
import { computeQuotePreviewForProperty } from "@/lib/pricing/quote-server";
import { nightsBetween } from "@/lib/quotes/wa-message";

export type FeeRow = {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  type: "cleaning" | "tourist_tax" | "other";
  amount_type: "fixed" | "percent" | "per_night" | "per_guest";
  amount: number;
  is_mandatory: boolean;
};

export type PromotionRow = {
  id: string;
  user_id: string;
  code: string;
  name: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_nights: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

export type SupplementRow = {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  description: string;
  price: number;
  price_type: "per_stay" | "per_night" | "per_person";
  is_optional: boolean;
  icon: string | null;
};

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseIsoDateUtc(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function promotionIsValidForStay(
  row: PromotionRow,
  nights: number,
  referenceDate: Date,
): boolean {
  if (!row.is_active) return false;
  if (!Number.isFinite(nights) || nights < row.min_nights) return false;
  if (row.max_uses != null && row.uses_count >= row.max_uses) return false;
  const ref = startOfUtcDay(referenceDate);
  if (row.valid_from) {
    const vf = parseIsoDateUtc(String(row.valid_from).slice(0, 10));
    if (ref < vf) return false;
  }
  if (row.valid_until) {
    const vu = parseIsoDateUtc(String(row.valid_until).slice(0, 10));
    if (ref > vu) return false;
  }
  return true;
}

export function computeFeeAmount(
  fee: FeeRow,
  ctx: { nights: number; guests: number; baseLodgingTotal: number },
): number {
  const amt = Number(fee.amount ?? 0);
  if (!Number.isFinite(amt) || amt < 0) return 0;
  switch (fee.amount_type) {
    case "fixed":
      return Math.round(amt * 100) / 100;
    case "percent": {
      const base = Math.max(0, ctx.baseLodgingTotal);
      return Math.round((base * amt) / 10000) / 100;
    }
    case "per_night":
      return Math.round(amt * ctx.nights * 100) / 100;
    case "per_guest":
      return Math.round(amt * ctx.guests * 100) / 100;
    default:
      return 0;
  }
}

export function computeSupplementAmount(
  sup: SupplementRow,
  ctx: { nights: number; guests: number },
): number {
  const p = Number(sup.price ?? 0);
  if (!Number.isFinite(p) || p < 0) return 0;
  switch (sup.price_type) {
    case "per_stay":
      return Math.round(p * 100) / 100;
    case "per_night":
      return Math.round(p * ctx.nights * 100) / 100;
    case "per_person":
      return Math.round(p * ctx.guests * 100) / 100;
    default:
      return 0;
  }
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function fmtFr(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("fr-FR")} ${currency}`;
}

export type FullQuotePricingOk = {
  lodgingPreview: QuotePreviewResult;
  /** Prix nuit de base (fiche logement), hors règles dynamiques. */
  propertyBasePrice: number;
  /** Frais de ménage fiche logement. */
  propertyCleaningFee: number;
  currency: string;
  lodgingTotal: number;
  lodgingNightlySubtotal: number;
  lodgingCleaningFee: number;
  lodgingActive: boolean;
  lodgingLines: string[];
  feeLines: { id: string; name: string; amount: number }[];
  feeTotal: number;
  supplementLines: { id: string; name: string; amount: number }[];
  supplementTotal: number;
  promotion: { id: string; code: string; name: string; discountAmount: number } | null;
  subtotalBeforePromo: number;
  grandTotal: number;
  waExtrasLines: string[];
  pricingExtras: Record<string, unknown>;
};

export async function computeFullQuotePricing(
  supabase: SupabaseClient,
  userId: string,
  input: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    promoCode?: string | null;
    supplementIds?: string[];
    /** Date de référence pour validité promo (ex. check-in). */
    promoReferenceDate?: Date;
  },
): Promise<{ ok: true; data: FullQuotePricingOk } | { ok: false; error: string; status: number }> {
  const guests = Math.max(1, Math.min(50, Math.round(Number(input.guests) || 1)));
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) {
    return { ok: false, error: "Séjour invalide.", status: 400 };
  }

  const preview = await computeQuotePreviewForProperty(
    supabase,
    userId,
    input.propertyId,
    input.checkIn,
    input.checkOut,
  );
  if (!preview.ok) {
    return { ok: false, error: preview.error, status: preview.status };
  }

  const propertyBasePrice = preview.base_price;
  const propertyCleaningFee = preview.cleaning_fee;

  const currency = preview.result.currency;
  const lodgingTotal = preview.result.total;
  const baseLodgingTotal = preview.result.nightly_subtotal + preview.result.cleaning_fee;

  const { data: feeRows } = await supabase
    .from("fees")
    .select("*")
    .eq("user_id", userId)
    .or(`property_id.is.null,property_id.eq.${input.propertyId}`);

  const fees = (feeRows ?? []) as Record<string, unknown>[];
  const feeLines: { id: string; name: string; amount: number }[] = [];
  let feeTotal = 0;
  for (const r of fees) {
    const fee: FeeRow = {
      id: String(r.id),
      user_id: String(r.user_id),
      property_id: r.property_id != null ? String(r.property_id) : null,
      name: String(r.name ?? ""),
      type: (r.type as FeeRow["type"]) ?? "other",
      amount_type: (r.amount_type as FeeRow["amount_type"]) ?? "fixed",
      amount: Number(r.amount ?? 0),
      is_mandatory: Boolean(r.is_mandatory),
    };
    const a = computeFeeAmount(fee, { nights, guests, baseLodgingTotal });
    if (a <= 0) continue;
    feeLines.push({ id: fee.id, name: fee.name, amount: a });
    feeTotal += a;
  }
  feeTotal = roundMoney(feeTotal);

  const selectedSet = new Set((input.supplementIds ?? []).map((x) => String(x).trim()).filter(Boolean));

  const { data: supRows } = await supabase
    .from("supplements")
    .select("*")
    .eq("user_id", userId)
    .or(`property_id.is.null,property_id.eq.${input.propertyId}`);

  const supplements = (supRows ?? []) as Record<string, unknown>[];
  const supplementLines: { id: string; name: string; amount: number }[] = [];
  let supplementTotal = 0;
  for (const r of supplements) {
    const sup: SupplementRow = {
      id: String(r.id),
      user_id: String(r.user_id),
      property_id: r.property_id != null ? String(r.property_id) : null,
      name: String(r.name ?? ""),
      description: String(r.description ?? ""),
      price: Number(r.price ?? 0),
      price_type: (r.price_type as SupplementRow["price_type"]) ?? "per_stay",
      is_optional: r.is_optional !== false,
      icon: r.icon != null ? String(r.icon) : null,
    };
    const include = !sup.is_optional || selectedSet.has(sup.id);
    if (!include) continue;
    const a = computeSupplementAmount(sup, { nights, guests });
    if (a <= 0) continue;
    supplementLines.push({ id: sup.id, name: sup.name, amount: a });
    supplementTotal += a;
  }
  supplementTotal = roundMoney(supplementTotal);

  const subtotalBeforePromo = roundMoney(lodgingTotal + feeTotal + supplementTotal);

  const refDate = input.promoReferenceDate ?? new Date();
  const promoRaw = (input.promoCode ?? "").trim();
  let promotion: FullQuotePricingOk["promotion"] = null;
  let discountAmount = 0;

  if (promoRaw) {
    const safeCode = promoRaw.replace(/[%_\\]/g, "");
    const { data: row } = await supabase
      .from("promotions")
      .select("*")
      .eq("user_id", userId)
      .ilike("code", safeCode)
      .maybeSingle();
    const r = row as Record<string, unknown> | null;
    if (r) {
      const p: PromotionRow = {
        id: String(r.id),
        user_id: String(r.user_id),
        code: String(r.code ?? ""),
        name: String(r.name ?? ""),
        discount_type: (r.discount_type as PromotionRow["discount_type"]) ?? "percent",
        discount_value: Number(r.discount_value ?? 0),
        min_nights: Math.max(1, Math.round(Number(r.min_nights ?? 1))),
        max_uses: r.max_uses != null ? Number(r.max_uses) : null,
        uses_count: Math.max(0, Math.round(Number(r.uses_count ?? 0))),
        valid_from: r.valid_from != null ? String(r.valid_from).slice(0, 10) : null,
        valid_until: r.valid_until != null ? String(r.valid_until).slice(0, 10) : null,
        is_active: r.is_active !== false,
      };
      if (promotionIsValidForStay(p, nights, refDate)) {
        const v = Number(p.discount_value ?? 0);
        if (p.discount_type === "percent" && v > 0) {
          discountAmount = roundMoney((subtotalBeforePromo * v) / 100);
        } else if (p.discount_type === "fixed" && v > 0) {
          discountAmount = roundMoney(Math.min(subtotalBeforePromo, v));
        }
        promotion = {
          id: p.id,
          code: p.code,
          name: p.name,
          discountAmount,
        };
      }
    }
  }

  const grandTotal = roundMoney(Math.max(0, subtotalBeforePromo - discountAmount));

  const waExtrasLines: string[] = [];
  if (feeLines.length) {
    waExtrasLines.push(
      `🧾 Frais : ${feeLines.map((l) => `${l.name} (${fmtFr(l.amount, currency)})`).join(" · ")}`,
    );
  }
  if (supplementLines.length) {
    waExtrasLines.push(
      `➕ Suppléments : ${supplementLines.map((l) => `${l.name} (${fmtFr(l.amount, currency)})`).join(" · ")}`,
    );
  }
  if (promotion && discountAmount > 0) {
    waExtrasLines.push(
      `🏷️ Promo ${promotion.code} (−${fmtFr(discountAmount, currency)})`,
    );
  }

  const pricingExtras = {
    lodging: {
      total: lodgingTotal,
      nightly_subtotal: preview.result.nightly_subtotal,
      cleaning_fee: preview.result.cleaning_fee,
      active: preview.result.active,
    },
    fees: feeLines,
    supplements: supplementLines,
    promotion,
    subtotal_before_promo: subtotalBeforePromo,
    grand_total: grandTotal,
  };

  return {
    ok: true,
    data: {
      lodgingPreview: preview.result,
      propertyBasePrice,
      propertyCleaningFee,
      currency,
      lodgingTotal,
      lodgingNightlySubtotal: preview.result.nightly_subtotal,
      lodgingCleaningFee: preview.result.cleaning_fee,
      lodgingActive: preview.result.active,
      lodgingLines: preview.result.lines,
      feeLines,
      feeTotal,
      supplementLines,
      supplementTotal,
      promotion,
      subtotalBeforePromo,
      grandTotal,
      waExtrasLines,
      pricingExtras,
    },
  };
}

export async function incrementPromotionUses(
  supabase: SupabaseClient,
  userId: string,
  promotionId: string,
) {
  const { data: row } = await supabase
    .from("promotions")
    .select("uses_count,max_uses")
    .eq("id", promotionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return;
  const uses = Math.max(0, Math.round(Number((row as { uses_count?: number }).uses_count ?? 0)));
  const maxU = (row as { max_uses?: number | null }).max_uses;
  if (maxU != null && uses >= maxU) return;
  await supabase
    .from("promotions")
    .update({ uses_count: uses + 1 })
    .eq("id", promotionId)
    .eq("user_id", userId);
}
