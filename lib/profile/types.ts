export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  company_logo: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  default_currency: string | null;
  default_language: string | null;
  quote_validity_hours: number | null;
  timezone: string | null;
  notify_new_booking: boolean | null;
  notify_quote_expired: boolean | null;
  notify_ical_error: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export const PROFILE_DEFAULTS: Omit<
  ProfileRow,
  "id" | "created_at" | "updated_at"
> = {
  full_name: null,
  phone: null,
  avatar_url: null,
  company_name: null,
  company_logo: null,
  address: null,
  city: null,
  country: "Sénégal",
  website: null,
  default_currency: "XOF",
  default_language: "fr",
  quote_validity_hours: 48,
  timezone: "Africa/Dakar",
  notify_new_booking: true,
  notify_quote_expired: true,
  notify_ical_error: true,
};
