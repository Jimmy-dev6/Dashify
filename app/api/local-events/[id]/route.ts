import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

type PatchBody = {
  name?: string;
  country?: string;
  city?: string | null;
  start_date?: string;
  end_date?: string;
  impact_multiplier?: number;
  is_recurring?: boolean;
  recurrence_type?: string;
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = (params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.country !== undefined) patch.country = String(body.country).trim() || "SN";
  if (body.city !== undefined) {
    patch.city = body.city != null && String(body.city).trim() ? String(body.city).trim() : null;
  }
  if (body.start_date !== undefined) patch.start_date = String(body.start_date).slice(0, 10);
  if (body.end_date !== undefined) patch.end_date = String(body.end_date).slice(0, 10);
  if (body.impact_multiplier !== undefined) {
    const mult = Number(body.impact_multiplier);
    if (!Number.isFinite(mult) || mult < 1 || mult > 2) {
      return NextResponse.json({ error: "Multiplicateur entre ×1,0 et ×2,0." }, { status: 400 });
    }
    patch.impact_multiplier = mult;
  }
  if (body.is_recurring !== undefined) patch.is_recurring = Boolean(body.is_recurring);
  if (body.recurrence_type !== undefined) {
    let r = String(body.recurrence_type).trim().toLowerCase() || "none";
    const rec =
      patch.is_recurring !== undefined
        ? Boolean(patch.is_recurring)
        : Boolean(body.is_recurring);
    if (rec && r !== "yearly" && !/^islamic:\d{1,2}:\d{1,2}$/.test(r)) r = "yearly";
    if (!rec) r = "none";
    patch.recurrence_type = r;
  }
  if (patch.is_recurring === false) patch.recurrence_type = "none";

  const start = patch.start_date as string | undefined;
  const end = patch.end_date as string | undefined;
  if (start && !isIsoDate(start)) {
    return NextResponse.json({ error: "start_date invalide." }, { status: 400 });
  }
  if (end && !isIsoDate(end)) {
    return NextResponse.json({ error: "end_date invalide." }, { status: 400 });
  }
  if (start && end && start > end) {
    return NextResponse.json({ error: "end_date avant start_date." }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("local_events")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = (params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("local_events").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
