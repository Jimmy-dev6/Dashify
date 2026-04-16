"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Currency = "XOF" | "EUR" | "USD";

function parseMoney(value: FormDataEntryValue | null) {
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

export type PropertyFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<
    Record<"name" | "city" | "base_price" | "cleaning_fee" | "currency", string>
  >;
};

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const currency = asCurrency(formData.get("currency")) ?? "XOF";
  const base_price = parseMoney(formData.get("base_price"));
  const cleaning_fee = parseMoney(formData.get("cleaning_fee"));

  const fieldErrors: PropertyFormState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Le nom est obligatoire.";
  if (base_price !== null && Number.isNaN(base_price)) {
    fieldErrors.base_price = "Prix invalide.";
  }
  if (cleaning_fee !== null && Number.isNaN(cleaning_fee)) {
    fieldErrors.cleaning_fee = "Frais invalides.";
  }
  if (!currency) fieldErrors.currency = "Devise invalide.";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors };
  }

  const { error } = await supabase.from("properties").insert({
    user_id: user.id,
    name,
    city: city || null,
    base_price: base_price ?? null,
    cleaning_fee: cleaning_fee ?? null,
    currency,
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

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const currency = asCurrency(formData.get("currency")) ?? "XOF";
  const base_price = parseMoney(formData.get("base_price"));
  const cleaning_fee = parseMoney(formData.get("cleaning_fee"));

  const fieldErrors: PropertyFormState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Le nom est obligatoire.";
  if (base_price !== null && Number.isNaN(base_price)) {
    fieldErrors.base_price = "Prix invalide.";
  }
  if (cleaning_fee !== null && Number.isNaN(cleaning_fee)) {
    fieldErrors.cleaning_fee = "Frais invalides.";
  }
  if (!currency) fieldErrors.currency = "Devise invalide.";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors };
  }

  const { error } = await supabase
    .from("properties")
    .update({
      name,
      city: city || null,
      base_price: base_price ?? null,
      cleaning_fee: cleaning_fee ?? null,
      currency,
    })
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

