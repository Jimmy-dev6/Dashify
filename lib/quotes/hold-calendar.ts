import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Crée un blocage de calendrier pour un devis.
 * - source = "quote_hold"
 * - status = "pending" (pour affichage orange différencié)
 * - external_uid = "quote:<quoteId>" pour pouvoir retrouver/libérer
 *
 * Ne lève pas d'erreur fatale : si l'insert échoue, on log et on continue
 * (le devis est créé sans bloquer les dates, mieux que de bloquer la création).
 */
export async function createQuoteHold(
  supabase: SupabaseClient,
  params: {
    quoteId: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { quoteId, propertyId, checkIn, checkOut } = params;

  const { error } = await supabase
    .from("calendar_events")
    .insert({
      property_id: propertyId,
      start_date: checkIn,
      end_date: checkOut,
      source: "quote_hold",
      status: "pending",
      external_uid: `quote:${quoteId}`,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[hold-calendar] createQuoteHold failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      quoteId,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Libère le blocage associé à un devis (appelé quand le devis devient
 * accepted, refused, expired, ou est supprimé).
 */
export async function releaseQuoteHold(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("source", "quote_hold")
    .eq("external_uid", `quote:${quoteId}`);

  if (error) {
    console.error("[hold-calendar] releaseQuoteHold failed", {
      code: error.code,
      message: error.message,
      quoteId,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Lazy expiration : passe en "expired" tous les devis de l'utilisateur
 * dont expires_at est dépassé, et libère leurs holds.
 *
 * À appeler depuis le GET /api/quotes pour maintenir la cohérence
 * sans cron job. Idempotent.
 */
export async function expireOverdueQuotes(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ expired: number }> {
  const now = new Date().toISOString();

  const { data: overdue, error: selErr } = await supabase
    .from("quotes")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["draft", "sent"])
    .lt("expires_at", now);

  if (selErr || !overdue || overdue.length === 0) {
    return { expired: 0 };
  }

  const ids = overdue.map((q) => q.id as string);

  // 1. Marquer les devis comme expirés
  const { error: updErr } = await supabase
    .from("quotes")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .in("id", ids);

  if (updErr) {
    console.error("[hold-calendar] expireOverdueQuotes update failed", updErr);
    return { expired: 0 };
  }

  // 2. Libérer les holds associés (un par un, pour rester simple et sûr)
  for (const id of ids) {
    await releaseQuoteHold(supabase, id);
  }

  return { expired: ids.length };
}