import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuoteWhatsAppMessage } from "@/lib/quotes/wa-message";

export type ProfileQuoteCtx = {
  company_name: string | null;
  company_logo: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  quote_validity_hours: number | null;
  default_language: string | null;
  default_currency: string | null;
  // Config paiement (Phase 2 Palier 4)
  payment_orange_money: string | null;
  payment_wave: string | null;
  payment_free_money: string | null;
  payment_holder_name: string | null;
  payment_instructions_extra: string | null;
};

export async function fetchProfileQuoteContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileQuoteCtx | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "company_name,company_logo,website,city,country,address,quote_validity_hours,default_language,default_currency,payment_orange_money,payment_wave,payment_free_money,payment_holder_name,payment_instructions_extra",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileQuoteCtx;
}

/**
 * Vérifie si un profil a au moins un moyen de paiement configuré.
 * Utilisé au Palier 6 pour bloquer la création de devis sans config paiement.
 */
export function profileHasAnyPaymentMethod(profile: ProfileQuoteCtx | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.payment_orange_money ||
      profile.payment_wave ||
      profile.payment_free_money,
  );
}

/**
 * Construit l'URL publique de paiement à partir d'une référence DSHF-XXXX.
 * Fallback sur localhost:3000 en dev, dashify-plum.vercel.app sinon.
 */
export function buildPaymentUrl(reference: string | null): string | null {
  if (!reference) return null;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
        ? "https://dashify-plum.vercel.app"
        : "http://localhost:3000");
  return `${base}/pay/${reference}`;
}

export function buildWaFromProfile(
  profile: ProfileQuoteCtx | null,
  args: {
    customerName: string;
    propertyName: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    total: number;
    propertyCurrency: string;
    /** Prioritaire sur le profil pour la durée de validité du devis dans le message. */
    quoteValidityHours?: number | null;
    policyConditionsBlock?: string | null;
    pricingExtrasLines?: string[] | null;
    /** Référence DSHF-XXXX du devis (Phase 2 Palier 4). */
    paymentReference?: string | null;
  },
) {
  const propCur = (args.propertyCurrency ?? "").trim();
  const defCur = (profile?.default_currency ?? "").trim();
  const currency = propCur || defCur || "XOF";
  const quoteHours =
    args.quoteValidityHours != null && args.quoteValidityHours !== undefined
      ? args.quoteValidityHours
      : profile?.quote_validity_hours;
  const paymentUrl = buildPaymentUrl(args.paymentReference ?? null);
  return buildQuoteWhatsAppMessage({
    customerName: args.customerName,
    propertyName: args.propertyName,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guests: args.guests,
    total: args.total,
    currency,
    companyName: profile?.company_name,
    companyWebsite: profile?.website,
    companyLogo: profile?.company_logo,
    companyCity: profile?.city,
    companyCountry: profile?.country,
    companyAddress: profile?.address,
    quoteValidityHours: quoteHours,
    language: profile?.default_language,
    policyConditionsBlock: args.policyConditionsBlock,
    pricingExtrasLines: args.pricingExtrasLines,
    // Bloc paiement
    paymentReference: args.paymentReference ?? null,
    paymentUrl,
    paymentOrangeMoney: profile?.payment_orange_money ?? null,
    paymentWave: profile?.payment_wave ?? null,
    paymentFreeMoney: profile?.payment_free_money ?? null,
    paymentHolderName: profile?.payment_holder_name ?? null,
    paymentInstructionsExtra: profile?.payment_instructions_extra ?? null,
  });
}