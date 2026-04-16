"use server";

/**
 * Server Actions devis : brouillon, envoi, acceptation → booking.
 * À brancher sur Supabase + checkAvailability().
 */
export async function saveQuoteDraft(_formData: FormData) {
  return { ok: false as const, error: "Non implémenté" };
}

export async function sendQuoteWhatsApp(_quoteId: string) {
  return { ok: false as const, error: "Non implémenté" };
}

export async function acceptQuote(_quoteId: string) {
  return { ok: false as const, error: "Non implémenté" };
}
