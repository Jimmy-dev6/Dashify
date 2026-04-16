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
  if (Boolean(a.at_booking) === Boolean(b.at_booking)) return false;
  return Math.abs(sum - 100) < 0.5;
}

type PatchBody = {
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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: exErr } = await supabase
    .from("policies")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (exErr || !existing) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
    patch.name = n;
  }

  if (body.payment_schedule !== undefined) {
    if (!isPaymentScheduleValid(body.payment_schedule)) {
      return NextResponse.json({ error: "Plan de paiement invalide." }, { status: 400 });
    }
    patch.payment_schedule = body.payment_schedule;
  }

  if (body.cancellation_type !== undefined) {
    const ct = String(body.cancellation_type).trim();
    if (!["non_refundable", "flexible", "moderate"].includes(ct)) {
      return NextResponse.json({ error: "Type d’annulation invalide." }, { status: 400 });
    }
    patch.cancellation_type = ct;
  }

  if (body.cancellation_days !== undefined) {
    patch.cancellation_days = Math.max(0, Math.round(Number(body.cancellation_days)));
  }
  if (body.cancellation_percent !== undefined) {
    patch.cancellation_percent = Math.min(
      100,
      Math.max(0, Math.round(Number(body.cancellation_percent))),
    );
  }

  if (body.deposit_type !== undefined) {
    const dt = String(body.deposit_type).trim();
    if (!["none", "fixed", "percent"].includes(dt)) {
      return NextResponse.json({ error: "Type de caution invalide." }, { status: 400 });
    }
    patch.deposit_type = dt;
  }

  if (body.deposit_value !== undefined) {
    patch.deposit_value = Math.max(0, Number(body.deposit_value));
  }

  if (body.quote_expiry_hours !== undefined) {
    const h = Math.round(Number(body.quote_expiry_hours));
    if (!Number.isFinite(h) || h < 1 || h > 168) {
      return NextResponse.json({ error: "Expiration devis : entre 1 et 168 h." }, { status: 400 });
    }
    patch.quote_expiry_hours = h;
  }

  if (body.is_default === true) {
    await supabase.from("policies").update({ is_default: false }).eq("user_id", user.id);
    patch.is_default = true;
  } else if (body.is_default === false) {
    patch.is_default = false;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { error } = await supabase.from("policies").update(patch as never).eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("policies").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
