import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FEE_TYPES = ["cleaning", "tourist_tax", "other"] as const;
const AMOUNT_TYPES = ["fixed", "percent", "per_night", "per_guest"] as const;

function validFeeType(t: string): t is (typeof FEE_TYPES)[number] {
  return (FEE_TYPES as readonly string[]).includes(t);
}

function validAmountType(t: string): t is (typeof AMOUNT_TYPES)[number] {
  return (AMOUNT_TYPES as readonly string[]).includes(t);
}

type PatchBody = {
  name?: string;
  propertyId?: string | null;
  type?: string;
  amountType?: string;
  amount?: number;
  isMandatory?: boolean;
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

  const id = params.id;
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    patch.name = n;
  }
  if (body.type !== undefined) {
    const t = String(body.type).toLowerCase();
    if (!validFeeType(t)) return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    patch.type = t;
  }
  if (body.amountType !== undefined) {
    const t = String(body.amountType).toLowerCase();
    if (!validAmountType(t)) return NextResponse.json({ error: "Type de montant invalide." }, { status: 400 });
    patch.amount_type = t;
  }
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a < 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    patch.amount = a;
  }
  if (body.isMandatory !== undefined) patch.is_mandatory = Boolean(body.isMandatory);
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

  const { error } = await supabase.from("fees").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("fees").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
