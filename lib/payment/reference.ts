/**
 * Helpers pour convertir entre un UUID de devis et une référence lisible DSHF-XXXX
 *
 * Stratégie : on utilise les 8 premiers caractères du UUID (avant le premier tiret)
 * converties en majuscules. Collision quasi impossible en pratique pour un SaaS
 * qui a moins de quelques dizaines de milliers de devis.
 *
 * Exemples :
 *   "6d4a26dc-1b99-45d1-bb1d-5368bbfb6ea0" → "DSHF-6D4A26DC"
 *   "8bb6702e-0851-4c3b-b04e-00b7d47a89e6" → "DSHF-8BB6702E"
 */

const PREFIX = "DSHF-";

export function formatReference(quoteId: string): string {
  const shortId = quoteId.split("-")[0]?.toUpperCase() ?? "";
  return `${PREFIX}${shortId}`;
}

/**
 * Parse une référence DSHF-XXXXXXXX et retourne le préfixe de UUID
 * (pour ensuite faire un WHERE id LIKE 'xxxxxxxx-%' côté Supabase)
 *
 * Retourne null si le format est invalide.
 */
export function parseReference(ref: string): string | null {
  if (!ref) return null;
  const normalized = ref.trim().toUpperCase();
  if (!normalized.startsWith(PREFIX)) return null;
  const shortId = normalized.slice(PREFIX.length);
  // Un préfixe UUID fait 8 caractères hex
  if (!/^[0-9A-F]{8}$/.test(shortId)) return null;
  return shortId.toLowerCase();
}