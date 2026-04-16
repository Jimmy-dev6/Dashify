import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isValidInternationalPhone(phone: string) {
  const t = phone.trim();
  if (!t.startsWith("+")) return false;
  const digits = t.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (!/^[1-9]/.test(digits)) return false;
  return /^\+[\d\s-]{9,}$/.test(t);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id,name,phone,email,source,notes,created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cErr || !customer) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select(
      "id,check_in,check_out,total,status,guests,property:properties(name)",
    )
    .eq("customer_id", id)
    .eq("user_id", user.id)
    .order("check_in", { ascending: false });

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  const { data: quotes, error: qErr } = await supabase
    .from("quotes")
    .select("id,check_in,check_out,total,status,created_at")
    .eq("customer_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  const listB = (bookings ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    property: Array.isArray(row.property) ? row.property[0] : row.property,
  }));

  let totalSpent = 0;
  for (const b of listB as unknown as { status: string; total: number }[]) {
    if (b.status !== "cancelled") totalSpent += Number(b.total ?? 0);
  }

  return NextResponse.json({
    customer,
    bookings: listB,
    quotes: quotes ?? [],
    totalSpentXof: Math.round(totalSpent),
  });
}

type PatchBody = {
  name?: string;
  phone?: string;
  email?: string | null;
  source?: string;
  notes?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const patch: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }
    patch.name = name;
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone).trim();
    if (!phone || !isValidInternationalPhone(phone)) {
      return NextResponse.json(
        { error: "Téléphone invalide : format international (+…)." },
        { status: 400 },
      );
    }
    patch.phone = phone;
  }
  if (body.email !== undefined) {
    patch.email = (body.email ?? "").trim() || null;
  }
  if (body.source !== undefined) {
    const source = String(body.source).trim();
    if (!["airbnb", "booking", "direct"].includes(source)) {
      return NextResponse.json({ error: "Source invalide." }, { status: 400 });
    }
    patch.source = source;
  }
  if (body.notes !== undefined) {
    patch.notes = (body.notes ?? "").trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("customers").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    const msg = error.message.includes("foreign key") || error.code === "23503"
      ? "Impossible de supprimer : ce client est lié à des réservations ou devis."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
