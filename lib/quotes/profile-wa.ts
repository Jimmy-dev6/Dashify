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
};

export async function fetchProfileQuoteContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileQuoteCtx | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "company_name,company_logo,website,city,country,address,quote_validity_hours,default_language,default_currency",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileQuoteCtx;
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
  },
) {
  const propCur = (args.propertyCurrency ?? "").trim();
  const defCur = (profile?.default_currency ?? "").trim();
  const currency = propCur || defCur || "XOF";
  const quoteHours =
    args.quoteValidityHours != null && args.quoteValidityHours !== undefined
      ? args.quoteValidityHours
      : profile?.quote_validity_hours;
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
  });
}
