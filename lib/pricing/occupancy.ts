import type { SupabaseClient } from "@supabase/supabase-js";

function monthKeyFromParts(y: number, m0: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function daysInMonth(y: number, m0: number) {
  return new Date(y, m0 + 1, 0).getDate();
}

function parseMonthKey(key: string): { y: number; m0: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (!Number.isFinite(y) || mo < 0 || mo > 11) return null;
  return { y, m0: mo };
}

/** Part d’occupation (0–100) pour un logement sur un mois calendaire (nuits réservées / jours du mois). */
export async function fetchOccupancyPercentForMonth(
  supabase: SupabaseClient,
  propertyId: string,
  monthKey: string,
): Promise<number> {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return 0;
  const { y, m0 } = parsed;
  const dim = daysInMonth(y, m0);
  const startIso = `${y}-${String(m0 + 1).padStart(2, "0")}-01`;
  const endIso = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("bookings")
    .select("check_in,check_out")
    .eq("property_id", propertyId)
    .eq("status", "confirmed")
    .lte("check_in", endIso)
    .gt("check_out", startIso);

  if (error || !data?.length) return 0;

  const occupied = new Set<string>();
  for (const row of data as { check_in: string; check_out: string }[]) {
    const ci = row.check_in;
    const co = row.check_out;
    let d = new Date(ci + "T12:00:00");
    const end = new Date(co + "T12:00:00");
    while (d < end) {
      const yy = d.getFullYear();
      const mm = d.getMonth();
      if (monthKeyFromParts(yy, mm) === monthKey) {
        const iso = `${yy}-${String(mm + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        occupied.add(iso);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  return Math.min(100, Math.round((occupied.size / dim) * 1000) / 10);
}

export async function fetchOccupancyMapForMonths(
  supabase: SupabaseClient,
  propertyId: string,
  monthKeys: string[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const uniq = Array.from(new Set(monthKeys)).filter(Boolean);
  await Promise.all(
    uniq.map(async (k) => {
      out[k] = await fetchOccupancyPercentForMonth(supabase, propertyId, k);
    }),
  );
  return out;
}
