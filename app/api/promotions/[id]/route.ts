import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DISCOUNT_TYPES = ["percent", "fixed"] as const;

function validDiscountType(t: string): t is (typeof DISCOUNT_TYPES)[number] {
  return (DISCOUNT_TYPES as readonly string[]).includes(t);
}

type PatchBody = {
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const patch: Record<string, unknown> = {};

  if (body.code !== undefined) {
    const code = String(body.code).trim().toUpperCase().replace(/\s+/g, "");
    if (!code || code.length < 2) return NextResponse.json({ error: "Code invalide." }, { status: 400 });
    patch.code = code;
  }
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    patch.name = n;
  }
  if (body.discountType !== undefined) {
    const t = String(body.discountType).toLowerCase();
    if (!validDiscountType(t)) return NextResponse.json({ error: "Type de réduction invalide." }, { status: 400 });
    patch.discount_type = t;
  }
  if (body.discountValue !== undefined) {
    const v = Number(body.discountValue);
    if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
    patch.discount_value = v;
  }
  if (body.minNights !== undefined) {
    patch.min_nights = Math.max(1, Math.round(Number(body.minNights)));
  }
  if (body.maxUses !== undefined) {
    patch.max_uses =
      body.maxUses === null || String(body.maxUses) === ""
        ? null
        : Math.max(1, Math.round(Number(body.maxUses)));
  }
  if (body.validFrom !== undefined) {
    patch.valid_from = body.validFrom?.trim() || null;
  }
  if (body.validUntil !== undefined) {
    patch.valid_until = body.validUntil?.trim() || null;
  }
  if (body.isActive !== undefined) patch.is_active = Boolean(body.isActive);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { error } = await supabase
    .from("promotions")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    if (String(error.message).toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "Ce code promo existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("promotions").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
