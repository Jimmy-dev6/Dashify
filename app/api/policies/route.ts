import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentLeg } from "@/lib/policies/types";

function isPaymentScheduleValid(raw: unknown): raw is PaymentLeg[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 2) return false;
  let sum = 0;
  for (const x of raw) {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    const pct = Number(o.percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return false;
    sum += pct;
    const atBooking = Boolean(o.at_booking);
    const daysRaw = o.days_before_checkin;
    const days =
      daysRaw != null && daysRaw !== "" && Number.isFinite(Number(daysRaw))
        ? Math.round(Number(daysRaw))
        : null;
    if (!atBooking && (days == null || days < 1)) return false;
    if (atBooking && days != null && days > 0) return false;
  }
  if (raw.length === 1) {
    const a = raw[0] as Record<string, unknown>;
    return Boolean(a.at_booking) && Math.abs(Number(a.percent) - 100) < 0.01;
  }
  const a = raw[0] as Record<string, unknown>;
  const b = raw[1] as Record<string, unknown>;
  const aBook = Boolean(a.at_booking);
  const bBook = Boolean(b.at_booking);
  if (aBook === bBook) return false;
  const sumOk = Math.abs(sum - 100) < 0.5;
  return sumOk;
}

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data ?? [] });
}

type PostBody = {
  name?: string;
  is_default?: boolean;
  payment_schedule?: unknown;
  cancellation_type?: string;
  cancellation_days?: number;
  cancellation_percent?: number;
  deposit_type?: string;
  deposit_value?: number;
  quote_expiry_hours?: number;
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

  if (!isPaymentScheduleValid(body.payment_schedule)) {
    return NextResponse.json(
      { error: "Plan de paiement invalide (1×100% à la réservation ou 2 paiements avec % et jours)." },
      { status: 400 },
    );
  }

  const ct = (body.cancellation_type ?? "non_refundable").trim();
  if (!["non_refundable", "flexible", "moderate"].includes(ct)) {
    return NextResponse.json({ error: "Type d’annulation invalide." }, { status: 400 });
  }

  const dt = (body.deposit_type ?? "none").trim();
  if (!["none", "fixed", "percent"].includes(dt)) {
    return NextResponse.json({ error: "Type de caution invalide." }, { status: 400 });
  }

  const cdays = Math.max(0, Math.round(Number(body.cancellation_days ?? 0)));
  const cpct = Math.min(100, Math.max(0, Math.round(Number(body.cancellation_percent ?? 0))));
  const depVal = Math.max(0, Number(body.deposit_value ?? 0));
  const qHours = Math.round(Number(body.quote_expiry_hours ?? 48));
  if (!Number.isFinite(qHours) || qHours < 1 || qHours > 168) {
    return NextResponse.json({ error: "Expiration devis : entre 1 et 168 heures." }, { status: 400 });
  }
  if (dt === "percent" && (depVal < 0 || depVal > 100)) {
    return NextResponse.json({ error: "Caution % : entre 0 et 100." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setDefault = Boolean(body.is_default);

  if (setDefault) {
    await supabase.from("policies").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data: row, error } = await supabase
    .from("policies")
    .insert({
      user_id: user.id,
      name,
      is_default: setDefault,
      payment_schedule: body.payment_schedule,
      cancellation_type: ct,
      cancellation_days: cdays,
      cancellation_percent: cpct,
      deposit_type: dt,
      deposit_value: depVal,
      quote_expiry_hours: qHours,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: row?.id });
}
