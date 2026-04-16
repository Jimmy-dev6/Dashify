import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRICE_TYPES = ["per_stay", "per_night", "per_person"] as const;

function validPriceType(t: string): t is (typeof PRICE_TYPES)[number] {
  return (PRICE_TYPES as readonly string[]).includes(t);
}

type PatchBody = {
  name?: string;
  description?: string;
  propertyId?: string | null;
  price?: number;
  priceType?: string;
  isOptional?: boolean;
  icon?: string | null;
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

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    patch.name = n;
  }
  if (body.description !== undefined) patch.description = String(body.description ?? "").trim();
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
    patch.price = p;
  }
  if (body.priceType !== undefined) {
    const t = String(body.priceType).toLowerCase();
    if (!validPriceType(t)) return NextResponse.json({ error: "Type de prix invalide." }, { status: 400 });
    patch.price_type = t;
  }
  if (body.isOptional !== undefined) patch.is_optional = Boolean(body.isOptional);
  if (body.icon !== undefined) patch.icon = body.icon?.trim() || null;
  if (body.propertyId !== undefined) {
    if (body.propertyId == null || String(body.propertyId).trim() === "") {
      patch.property_id = null;
    } else {
      const pid = String(body.propertyId).trim();
      const { data: prop } = await supabase
        .from("properties")
        .select("id")
        .eq("id", pid)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prop) return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
      patch.property_id = pid;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { error } = await supabase
    .from("supplements")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("supplements").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
