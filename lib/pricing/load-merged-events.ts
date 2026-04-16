import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeAllEventWindows, type PriceEventWindow } from "@/lib/pricing/event-windows";

export async function loadMergedPricingEventWindows(
  supabase: SupabaseClient,
  userId: string,
  params: {
    years: number[];
    propertyCity: string | null;
    propertyCountry: string | null;
    useBuiltin: boolean;
    /** Si false, aucun événement (ni intégrés ni base). */
    enabled: boolean;
  },
): Promise<PriceEventWindow[]> {
  if (!params.enabled) return [];
  const { data: rows, error } = await supabase
    .from("local_events")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    return mergeAllEventWindows(params.years, params.propertyCity, params.propertyCountry, params.useBuiltin, []);
  }
  const userRows = (rows ?? []) as Record<string, unknown>[];
  return mergeAllEventWindows(
    params.years,
    params.propertyCity,
    params.propertyCountry,
    params.useBuiltin,
    userRows,
  );
}
