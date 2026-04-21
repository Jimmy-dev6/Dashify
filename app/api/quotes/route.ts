import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAvailability } from "@/lib/availability";
import { createQuoteHold, expireOverdueQuotes } from "@/lib/quotes/hold-calendar";
import { formatPolicyConditionsBlock, policyFromRow } from "@/lib/policies/format-wa";
import type { PolicyRow } from "@/lib/policies/types";
import {
  computeFullQuotePricing,
  incrementPromotionUses,
} from "@/lib/pricing/full-quote-pricing";
import { computeQuotePreviewForProperty } from "@/lib/pricing/quote-server";
import { buildWaFromProfile, fetchProfileQuoteContext } from "@/lib/quotes/profile-wa";
import { clampQuoteValidityHours, nightsBetween } from "@/lib/quotes/wa-message";

type Body = {
  propertyId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number;
  waMessage?: string | null;
  policyId?: string | null;
  promoCode?: string | null;
  supplementIds?: string[];
};

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function monthBoundsUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), next: next.toISOString() };
}

type QuoteRowRaw = {
  id: string;
  property_id: string;
  customer_id: string;
  policy_id: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total: number;
  wa_message: string | null;
  status: string;
  expires_at: string;
  created_at: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const propertyId = (searchParams.get("propertyId") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Lazy expiration : nettoie les devis périmés avant de renvoyer la liste
  await expireOverdueQuotes(supabase, userData.user.id);

  const profileCtx = await fetchProfileQuoteContext(supabase, userData.user.id);

  const { data: rows, error } = await supabase
    .from("quotes")
    .select(
      "id,property_id,customer_id,policy_id,check_in,check_out,guests,total,wa_message,status,expires_at,created_at",
    )
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (rows ?? []) as QuoteRowRaw[];

  const propertyIds = Array.from(new Set(all.map((q) => q.property_id).filter(Boolean)));
  const customerIds = Array.from(new Set(all.map((q) => q.customer_id).filter(Boolean)));

  const [{ data: propRows }, { data: custRows }] = await Promise.all([
    propertyIds.length
      ? supabase
          .from("properties")
          .select("id,name,currency")
          .eq("user_id", userData.user.id)
          .in("id", propertyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; currency: string | null }> }),
    customerIds.length
      ? supabase
          .from("customers")
          .select("id,name,phone")
          .eq("user_id", userData.user.id)
          .in("id", customerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; phone: string }> }),
  ]);

  const propertiesById = new Map(
    (propRows ?? []).map((p) => [String(p.id), { name: String(p.name ?? ""), currency: (p.currency as string | null) ?? null }]),
  );
  const customersById = new Map(
    (custRows ?? []).map((c) => [String(c.id), { name: String(c.name ?? ""), phone: String(c.phone ?? "") }]),
  );
  const { start: monthStart, next: monthNext } = monthBoundsUtc();

  let createdThisMonth = 0;
  let acceptedThisMonth = 0;
  let acceptedAmountThisMonth = 0;

  for (const q of all) {
    const ca = new Date(q.created_at).toISOString();
    if (ca >= monthStart && ca < monthNext) {
      createdThisMonth += 1;
      if (q.status === "accepted") {
        acceptedThisMonth += 1;
        acceptedAmountThisMonth += Number(q.total ?? 0);
      }
    }
  }

  const conversionPct =
    createdThisMonth > 0 ? Math.round((acceptedThisMonth / createdThisMonth) * 1000) / 10 : 0;

  let list = all;
  if (propertyId) list = list.filter((q) => q.property_id === propertyId);
  if (status && ["draft", "sent", "accepted", "refused", "expired"].includes(status)) {
    list = list.filter((q) => q.status === status);
  }

  const quotes = list.map((q) => {
    const property = propertiesById.get(q.property_id) ?? null;
    const customer = customersById.get(q.customer_id) ?? null;
    const nights = nightsBetween(q.check_in, q.check_out);
    const wa =
      (q.wa_message ?? "").trim() ||
      buildWaFromProfile(profileCtx, {
        customerName: customer?.name ?? "client",
        propertyName: property?.name ?? "votre logement",
        checkIn: q.check_in,
        checkOut: q.check_out,
        guests: Number(q.guests ?? 1),
        total: Number(q.total ?? 0),
        propertyCurrency: property?.currency ?? "XOF",
      });
    return {
      id: q.id,
      property_id: q.property_id,
      customer_id: q.customer_id,
      policy_id: q.policy_id ?? null,
      check_in: q.check_in,
      check_out: q.check_out,
      guests: q.guests,
      total: Number(q.total ?? 0),
      wa_message: wa,
      status: q.status,
      expires_at: q.expires_at,
      created_at: q.created_at,
      nights,
      property: property ? { name: property.name, currency: property.currency ?? "XOF" } : null,
      customer: customer ? { name: customer.name, phone: customer.phone } : null,
    };
  });

  return NextResponse.json({
    quotes,
    stats: {
      totalThisMonth: createdThisMonth,
      acceptedThisMonth,
      acceptedAmountXof: Math.round(acceptedAmountThisMonth),
      conversionPct,
    },
  });
}

function isValidInternationalPhone(phone: string) {
  const t = phone.trim();
  if (!t.startsWith("+")) return false;
  const digits = t.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (!/^[1-9]/.test(digits)) return false;
  return /^\+[\d\s-]{9,}$/.test(t);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const propertyId = body.propertyId;
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;
  const guests = Number(body.guests ?? 1);

  if (!propertyId || !isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return NextResponse.json(
      { error: "Champs requis: propertyId, checkIn, checkOut." },
      { status: 400 },
    );
  }

  if (checkIn >= checkOut) {
    return NextResponse.json(
      { error: "La date de départ doit être après la date d’arrivée." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(guests) || guests < 1 || guests > 50) {
    return NextResponse.json({ error: "Nombre de voyageurs invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: propRow, error: propErr } = await supabase
    .from("properties")
    .select("id,name,currency,base_price,cleaning_fee")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (propErr || !propRow) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const profileCtx = await fetchProfileQuoteContext(supabase, user.id);

  const propertyName = String(propRow.name ?? "");
  const propertyCurrency = (propRow.currency as string | null) ?? "XOF";

  const preview = await computeQuotePreviewForProperty(
    supabase,
    user.id,
    propertyId,
    checkIn,
    checkOut,
  );
  if (!preview.ok) {
    return NextResponse.json({ error: preview.error }, { status: preview.status });
  }

  const useDynamic = preview.result.active;

  const supplementIds = Array.isArray(body.supplementIds)
    ? body.supplementIds.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const fullPrice = await computeFullQuotePricing(supabase, user.id, {
    propertyId,
    checkIn,
    checkOut,
    guests,
    promoCode: typeof body.promoCode === "string" ? body.promoCode : null,
    supplementIds,
    promoReferenceDate: new Date(),
  });
  if (!fullPrice.ok) {
    return NextResponse.json({ error: fullPrice.error }, { status: fullPrice.status });
  }

  const finalTotal = fullPrice.data.grandTotal;
  const pricingExtrasLines =
    fullPrice.data.waExtrasLines.length > 0 ? fullPrice.data.waExtrasLines : null;

  if (!Number.isFinite(finalTotal) || finalTotal < 0) {
    return NextResponse.json({ error: "Total invalide." }, { status: 400 });
  }

  const conflicts = await checkAvailability(supabase, { propertyId, checkIn, checkOut });
  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Indisponible sur ces dates (conflit calendrier ou réservation).",
        conflicts,
      },
      { status: 409 },
    );
  }

  let customerId = (body.customerId ?? null) as string | null;
  const customerName = (body.customerName ?? "").trim();
  const customerPhone = (body.customerPhone ?? "").trim();

  let resolvedCustomerName = customerName;

  if (!customerId) {
    if (!customerName || !customerPhone || !isValidInternationalPhone(customerPhone)) {
      return NextResponse.json(
        { error: "Sélectionnez un client ou renseignez nom + téléphone international (+…)." },
        { status: 400 },
      );
    }

    const { data: insertedCustomer, error: insertCustomerError } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: customerName,
        phone: customerPhone,
        source: "direct",
      })
      .select("id,name")
      .single();

    if (insertCustomerError || !insertedCustomer) {
      return NextResponse.json(
        { error: insertCustomerError?.message ?? "Erreur création client." },
        { status: 500 },
      );
    }

    customerId = insertedCustomer.id as string;
    resolvedCustomerName = String((insertedCustomer as { name?: string }).name ?? customerName);
  } else {
    const { data: cust, error: cErr } = await supabase
      .from("customers")
      .select("id,name")
      .eq("id", customerId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (cErr || !cust) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }
    resolvedCustomerName = String((cust as { name?: string }).name ?? "client");
  }

  let policyRow: PolicyRow | null = null;
  const rawPolicyId = typeof body.policyId === "string" ? body.policyId.trim() : "";
  if (rawPolicyId) {
    const { data: pol, error: polErr } = await supabase
      .from("policies")
      .select("*")
      .eq("id", rawPolicyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!polErr && pol) {
      policyRow = policyFromRow(pol as Record<string, unknown>);
    }
  }

  const lang = profileCtx?.default_language?.toLowerCase() === "en" ? "en" : "fr";
  const conditionsBlock = policyRow ? formatPolicyConditionsBlock(policyRow, lang, propertyCurrency) : "";
  const validityH = policyRow
    ? clampQuoteValidityHours(policyRow.quote_expiry_hours)
    : clampQuoteValidityHours(profileCtx?.quote_validity_hours);
  const expiresAt = new Date(Date.now() + validityH * 60 * 60 * 1000).toISOString();

  const waMessage =
    (!useDynamic && body.waMessage != null && String(body.waMessage).trim()) ||
    buildWaFromProfile(profileCtx, {
      customerName: resolvedCustomerName,
      propertyName: propertyName || "votre logement",
      checkIn,
      checkOut,
      guests,
      total: finalTotal,
      propertyCurrency,
      quoteValidityHours: validityH,
      policyConditionsBlock: conditionsBlock || null,
      pricingExtrasLines,
    });

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    property_id: propertyId,
    customer_id: customerId,
    policy_id: policyRow?.id ?? null,
    check_in: checkIn,
    check_out: checkOut,
    guests,
    total: finalTotal,
    wa_message: waMessage,
    status: "draft",
    expires_at: expiresAt,
    promotion_id: fullPrice.data.promotion?.id ?? null,
    promo_discount: fullPrice.data.promotion?.discountAmount ?? 0,
    supplement_ids: supplementIds,
    pricing_extras: fullPrice.data.pricingExtras,
  };

  const { data: quote, error } = await supabase.from("quotes").insert(insertRow).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (fullPrice.data.promotion?.id) {
    void incrementPromotionUses(supabase, user.id, fullPrice.data.promotion.id);
  }

  // Créer le blocage calendrier pour ce devis (dates bloquées pendant sa validité)
  if (quote?.id) {
    await createQuoteHold(supabase, {
      quoteId: quote.id as string,
      propertyId,
      checkIn,
      checkOut,
    });
  }

  return NextResponse.json({ ok: true, id: quote?.id });
}
