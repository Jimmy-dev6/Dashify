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

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("fees")
    .select("*,property:properties(id,name)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fees: data ?? [] });
}

type PostBody = {
  name?: string;
  propertyId?: string | null;
  type?: string;
  amountType?: string;
  amount?: number;
  isMandatory?: boolean;
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

  const type = (body.type ?? "other").toLowerCase();
  if (!validFeeType(type)) {
    return NextResponse.json({ error: "Type de frais invalide." }, { status: 400 });
  }

  const amountType = (body.amountType ?? "fixed").toLowerCase();
  if (!validAmountType(amountType)) {
    return NextResponse.json({ error: "Type de montant invalide." }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let propertyId: string | null = null;
  const rawPid = body.propertyId;
  if (rawPid != null && String(rawPid).trim() !== "") {
    const pid = String(rawPid).trim();
    const { data: prop } = await supabase
      .from("properties")
      .select("id")
      .eq("id", pid)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!prop) return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    propertyId = pid;
  }

  const { data, error } = await supabase
    .from("fees")
    .insert({
      user_id: user.id,
      property_id: propertyId,
      name,
      type,
      amount_type: amountType,
      amount,
      is_mandatory: body.isMandatory !== false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
