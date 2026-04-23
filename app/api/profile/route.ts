import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_DEFAULTS, type ProfileRow } from "@/lib/profile/types";

function mergeProfile(row: ProfileRow | null): ProfileRow {
  if (!row) {
    return {
      id: "",
      ...PROFILE_DEFAULTS,
    };
  }
  return {
    ...row,
    country: row.country ?? PROFILE_DEFAULTS.country,
    default_currency: row.default_currency ?? PROFILE_DEFAULTS.default_currency,
    default_language: row.default_language ?? PROFILE_DEFAULTS.default_language,
    quote_validity_hours: row.quote_validity_hours ?? PROFILE_DEFAULTS.quote_validity_hours,
    timezone: row.timezone ?? PROFILE_DEFAULTS.timezone,
    notify_new_booking: row.notify_new_booking ?? PROFILE_DEFAULTS.notify_new_booking,
    notify_quote_expired: row.notify_quote_expired ?? PROFILE_DEFAULTS.notify_quote_expired,
    notify_ical_error: row.notify_ical_error ?? PROFILE_DEFAULTS.notify_ical_error,
  };
}

const CURRENCIES = ["XOF", "EUR", "USD"] as const;
const LANGUAGES = ["fr", "en"] as const;
const VALIDITY = [24, 48, 72] as const;

// Accepte tout ce que l'hôte peut saisir : "+221 77 869 63 39", "221778696339", "778696339", "77 869 63 39"
// Normalise vers le format DB "7XXXXXXXX" (9 chiffres commençant par 7)
function normalizeMobileNumberSN(raw: string): string | null {
  if (!raw) return null;
  // Garde uniquement les chiffres
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Retire le préfixe pays éventuel (+221 ou 00221)
  let local = digits;
  if (local.startsWith("00221")) local = local.slice(5);
  else if (local.startsWith("221")) local = local.slice(3);

  // Doit maintenant être 9 chiffres commençant par 7
  if (!/^7[0-9]{8}$/.test(local)) return null;
  return local;
}

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profile = mergeProfile((row as ProfileRow | null) ?? null);
  profile.id = user.id;

  return NextResponse.json({
    email: user.email ?? "",
    profile,
  });
}

type PatchBody = Partial<{
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
  // Config paiement (Phase 2)
  payment_orange_money: string | null;
  payment_wave: string | null;
  payment_free_money: string | null;
  payment_holder_name: string | null;
  payment_instructions_extra: string | null;
}>;

export async function PATCH(req: Request) {
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

  const patch: Record<string, unknown> = { id: user.id };

  if (body.full_name !== undefined) patch.full_name = body.full_name?.trim() || null;
  if (body.phone !== undefined) patch.phone = body.phone?.trim() || null;
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url?.trim() || null;
  if (body.company_name !== undefined) patch.company_name = body.company_name?.trim() || null;
  if (body.company_logo !== undefined) patch.company_logo = body.company_logo?.trim() || null;
  if (body.address !== undefined) patch.address = body.address?.trim() || null;
  if (body.city !== undefined) patch.city = body.city?.trim() || null;
  if (body.country !== undefined) patch.country = body.country?.trim() || null;
  if (body.website !== undefined) {
    const w = body.website?.trim() || "";
    patch.website = w || null;
  }

  if (body.default_currency !== undefined) {
    const c = (body.default_currency ?? "").trim().toUpperCase();
    if (!CURRENCIES.includes(c as (typeof CURRENCIES)[number])) {
      return NextResponse.json({ error: "Devise invalide." }, { status: 400 });
    }
    patch.default_currency = c;
  }

  if (body.default_language !== undefined) {
    const l = (body.default_language ?? "").trim().toLowerCase();
    if (!LANGUAGES.includes(l as (typeof LANGUAGES)[number])) {
      return NextResponse.json({ error: "Langue invalide." }, { status: 400 });
    }
    patch.default_language = l;
  }

  if (body.quote_validity_hours !== undefined) {
    const h = Number(body.quote_validity_hours);
    if (!Number.isFinite(h) || !VALIDITY.includes(h as (typeof VALIDITY)[number])) {
      return NextResponse.json({ error: "Durée de validité invalide (24, 48 ou 72h)." }, { status: 400 });
    }
    patch.quote_validity_hours = h;
  }

  if (body.timezone !== undefined) {
    const tz = body.timezone?.trim() || "";
    if (!tz || tz.length > 80) {
      return NextResponse.json({ error: "Fuseau horaire invalide." }, { status: 400 });
    }
    patch.timezone = tz;
  }

  if (body.notify_new_booking !== undefined) patch.notify_new_booking = Boolean(body.notify_new_booking);
  if (body.notify_quote_expired !== undefined) {
    patch.notify_quote_expired = Boolean(body.notify_quote_expired);
  }
  if (body.notify_ical_error !== undefined) patch.notify_ical_error = Boolean(body.notify_ical_error);

  // --- Config paiement (Phase 2) ---
  if (body.payment_orange_money !== undefined) {
    const raw = body.payment_orange_money?.trim() || "";
    if (raw === "") {
      patch.payment_orange_money = null;
    } else {
      const normalized = normalizeMobileNumberSN(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: "Numéro Orange Money invalide. Format attendu : 77 869 63 39." },
          { status: 400 },
        );
      }
      patch.payment_orange_money = normalized;
    }
  }

  if (body.payment_wave !== undefined) {
    const raw = body.payment_wave?.trim() || "";
    if (raw === "") {
      patch.payment_wave = null;
    } else {
      const normalized = normalizeMobileNumberSN(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: "Numéro Wave invalide. Format attendu : 77 869 63 39." },
          { status: 400 },
        );
      }
      patch.payment_wave = normalized;
    }
  }

  if (body.payment_free_money !== undefined) {
    const raw = body.payment_free_money?.trim() || "";
    if (raw === "") {
      patch.payment_free_money = null;
    } else {
      const normalized = normalizeMobileNumberSN(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: "Numéro Free Money invalide. Format attendu : 77 869 63 39." },
          { status: 400 },
        );
      }
      patch.payment_free_money = normalized;
    }
  }

  if (body.payment_holder_name !== undefined) {
    const raw = body.payment_holder_name?.trim() || "";
    if (raw.length > 100) {
      return NextResponse.json(
        { error: "Nom du titulaire trop long (max 100 caractères)." },
        { status: 400 },
      );
    }
    patch.payment_holder_name = raw || null;
  }

  if (body.payment_instructions_extra !== undefined) {
    const raw = body.payment_instructions_extra?.trim() || "";
    if (raw.length > 200) {
      return NextResponse.json(
        { error: "Instructions trop longues (max 200 caractères)." },
        { status: 400 },
      );
    }
    patch.payment_instructions_extra = raw || null;
  }

  const keys = Object.keys(patch).filter((k) => k !== "id");
  if (keys.length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert(patch as never, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}