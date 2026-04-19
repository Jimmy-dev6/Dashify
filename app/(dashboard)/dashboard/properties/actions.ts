"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VALID_AMENITY_IDS } from "./property-constants";

type Currency = "XOF" | "EUR" | "USD";

type PropertyType = "appartement" | "villa" | "studio" | "bungalow" | "maison" | "chambre";

function parseMoney(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const s = String(value).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

function parseInteger(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN;
  return n;
}

function parseDecimal(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const s = String(value).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

function asCurrency(v: FormDataEntryValue | null): Currency | null {
  if (v === null) return null;
  const s = String(v);
  if (s === "XOF" || s === "EUR" || s === "USD") return s;
  return null;
}

function asPropertyType(v: FormDataEntryValue | null): PropertyType | null {
  if (v === null) return null;
  const s = String(v);
  if (s === "appartement" || s === "villa" || s === "studio" || s === "bungalow" || s === "maison" || s === "chambre") {
    return s;
  }
  return null;
}

function parseAmenities(formData: FormData): string[] {
  const selected = formData.getAll("amenities").map((v) => String(v));
  return selected.filter((id) => VALID_AMENITY_IDS.has(id as never));
}

function nullIfEmpty(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s || null;
}

export type PropertyFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"name" | "city" | "base_price" | "cleaning_fee" | "currency" | "surface_m2" | "max_guests" | "bedrooms" | "beds" | "bathrooms", string>>;
};

type PropertyPayload = {
  name: string;
  city: string | null;
  base_price: number | null;
  cleaning_fee: number | null;
  currency: Currency;
  description: string | null;
  internal_name: string | null;
  address: string | null;
  neighborhood: string | null;
  property_type: PropertyType | null;
  surface_m2: number | null;
  max_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: string[];
};

function extractAndValidate(formData: FormData): {
  payload: PropertyPayload | null;
  fieldErrors: NonNullable<PropertyFormState["fieldErrors"]>;
} {
  const name = String(formData.get("name") ?? "").trim();
  const city = nullIfEmpty(formData.get("city"));
  const currency = asCurrency(formData.get("currency")) ?? "XOF";
  const base_price = parseMoney(formData.get("base_price"));
  const cleaning_fee = parseMoney(formData.get("cleaning_fee"));

  const description = nullIfEmpty(formData.get("description"));
  const internal_name = nullIfEmpty(formData.get("internal_name"));
  const address = nullIfEmpty(formData.get("address"));
  const neighborhood = nullIfEmpty(formData.get("neighborhood"));
  const property_type = asPropertyType(formData.get("property_type"));

  const surface_m2 = parseInteger(formData.get("surface_m2"));
  const max_guests = parseInteger(formData.get("max_guests"));
  const bedrooms = parseInteger(formData.get("bedrooms"));
  const beds = parseInteger(formData.get("beds"));
  const bathrooms = parseDecimal(formData.get("bathrooms"));

  const amenities = parseAmenities(formData);

  const fieldErrors: NonNullable<PropertyFormState["fieldErrors"]> = {};
  if (!name) fieldErrors.name = "Le nom est obligatoire.";
  if (base_price !== null && Number.isNaN(base_price)) fieldErrors.base_price = "Prix invalide.";
  if (cleaning_fee !== null && Number.isNaN(cleaning_fee)) fieldErrors.cleaning_fee = "Frais invalides.";
  if (!currency) fieldErrors.currency = "Devise invalide.";

  if (surface_m2 !== null && (Number.isNaN(surface_m2) || surface_m2 < 0 || surface_m2 > 10000)) {
    fieldErrors.surface_m2 = "Surface invalide (0-10000 m²).";
  }
  if (max_guests !== null && (Number.isNaN(max_guests) || max_guests < 1 || max_guests > 50)) {
    fieldErrors.max_guests = "Capacité invalide (1-50).";
  }
  if (bedrooms !== null && (Number.isNaN(bedrooms) || bedrooms < 0 || bedrooms > 50)) {
    fieldErrors.bedrooms = "Nombre invalide.";
  }
  if (beds !== null && (Number.isNaN(beds) || beds < 0 || beds > 50)) {
    fieldErrors.beds = "Nombre invalide.";
  }
  if (bathrooms !== null && (Number.isNaN(bathrooms) || bathrooms < 0 || bathrooms > 50)) {
    fieldErrors.bathrooms = "Nombre invalide.";
  }

  if (Object.keys(fieldErrors).length) {
    return { payload: null, fieldErrors };
  }

  return {
    payload: {
      name,
      city,
      base_price: base_price === null || Number.isNaN(base_price) ? null : base_price,
      cleaning_fee: cleaning_fee === null || Number.isNaN(cleaning_fee) ? null : cleaning_fee,
      currency,
      description,
      internal_name,
      address,
      neighborhood,
      property_type,
      surface_m2: surface_m2 === null || Number.isNaN(surface_m2) ? null : surface_m2,
      max_guests: max_guests === null || Number.isNaN(max_guests) ? null : max_guests,
      bedrooms: bedrooms === null || Number.isNaN(bedrooms) ? null : bedrooms,
      beds: beds === null || Number.isNaN(beds) ? null : beds,
      bathrooms: bathrooms === null || Number.isNaN(bathrooms) ? null : bathrooms,
      amenities,
    },
    fieldErrors: {},
  };
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { payload, fieldErrors } = extractAndValidate(formData);
  if (!payload) return { ok: false, fieldErrors };

  const { error } = await supabase.from("properties").insert({
    user_id: user.id,
    ...payload,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}

export async function updateProperty(
  propertyId: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { payload, fieldErrors } = extractAndValidate(formData);
  if (!payload) return { ok: false, fieldErrors };

  const { error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", propertyId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}

export async function deleteProperty(propertyId: string) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/properties");
}