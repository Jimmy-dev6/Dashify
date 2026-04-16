import type { SupabaseClient } from "@supabase/supabase-js";

export type AvailabilityConflict = {
  id: string;
  source: string;
  start_date: string;
  end_date: string;
};

/**
 * Vérifie les chevauchements sur `calendar_events` (fenêtre demi-ouverte :
 * start inclusive, end exclusive côté métier).
 */
export async function checkAvailability(
  supabase: SupabaseClient,
  params: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<AvailabilityConflict[]> {
  const { propertyId, checkIn, checkOut } = params;

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, source, start_date, end_date")
    .eq("property_id", propertyId)
    .neq("status", "cancelled")
    .lt("start_date", checkOut)
    .gt("end_date", checkIn);

  if (error) {
    throw error;
  }

  return (data ?? []) as AvailabilityConflict[];
}
