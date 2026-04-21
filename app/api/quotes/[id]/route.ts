import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWaFromProfile, fetchProfileQuoteContext } from "@/lib/quotes/profile-wa";
import { nightsBetween } from "@/lib/quotes/wa-message";
import { releaseQuoteHold } from "@/lib/quotes/hold-calendar";

const STATUSES = ["draft", "sent", "accepted", "refused", "expired"] as const;
type QuoteStatus = (typeof STATUSES)[number];

function isQuoteStatus(s: string): s is QuoteStatus {
  return (STATUSES as readonly string[]).includes(s);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id,property_id,customer_id,policy_id,check_in,check_out,guests,total,wa_message,status,expires_at,created_at",
    )
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const profileCtx = await fetchProfileQuoteContext(supabase, userData.user.id);

  const row = data as Record<string, unknown>;
  const propertyId = String(row.property_id);
  const customerId = String(row.customer_id);

  const [{ data: propertyRow }, { data: customerRow }] = await Promise.all([
    supabase
      .from("properties")
      .select("id,name,currency")
      .eq("id", propertyId)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id,name,phone")
      .eq("id", customerId)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  const property = (propertyRow ?? null) as { name?: string; currency?: string | null } | null;
  const customer = (customerRow ?? null) as { name?: string; phone?: string } | null;

  const checkIn = String(row.check_in);
  const checkOut = String(row.check_out);
  const guests = Number(row.guests ?? 1);
  const total = Number(row.total ?? 0);
  const waStored = row.wa_message != null ? String(row.wa_message) : "";
  const waMessage =
    waStored.trim() ||
    buildWaFromProfile(profileCtx, {
      customerName: customer?.name ?? "client",
      propertyName: property?.name ?? "votre logement",
      checkIn,
      checkOut,
      guests,
      total,
      propertyCurrency: property?.currency ?? "XOF",
    });

  const quote = {
    id: String(row.id),
    property_id: propertyId,
    customer_id: customerId,
    policy_id: row.policy_id != null ? String(row.policy_id) : null,
    check_in: checkIn,
    check_out: checkOut,
    guests,
    total: Number(total),
    wa_message: waMessage,
    status: String(row.status),
    expires_at: String(row.expires_at),
    created_at: String(row.created_at),
    nights: nightsBetween(checkIn, checkOut),
    property: property ? { name: property.name ?? "", currency: property.currency ?? "XOF" } : null,
    customer: customer
      ? { name: customer.name ?? "", phone: customer.phone ?? "" }
      : null,
  };

  return NextResponse.json({ quote });
}

type PatchBody = {
  status?: string;
  wa_message?: string | null;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!isQuoteStatus(String(body.status))) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.wa_message !== undefined) {
    patch.wa_message = body.wa_message;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("quotes")
    .update(patch as never)
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si le devis passe à accepted/refused/expired, on libère le hold
  // (la chambre redevient disponible, ou une vraie réservation prendra le relais)
  const newStatus = body.status;
  if (newStatus === "accepted" || newStatus === "refused" || newStatus === "expired") {
    await releaseQuoteHold(supabase, id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Libérer le hold avant de supprimer le devis
  // (ordre important : on ne peut plus retrouver le hold après la suppression du quote)
  await releaseQuoteHold(supabase, id);

  const { error } = await supabase.from("quotes").delete().eq("id", id).eq("user_id", userData.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
