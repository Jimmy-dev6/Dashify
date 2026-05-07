import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcsEvents } from "@/lib/ical/parse-ics";

export type ChannelRow = {
  id: string;
  property_id: string;
  platform: "airbnb" | "booking" | "vrbo" | "expedia" | "other";
  ical_url: string;
  is_active: boolean;
  error_count: number;
};

const USER_AGENT = "Dashify/1.0";

function assertFetchableUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("URL iCal invalide.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Seuls les schémas http(s) sont autorisés.");
  }
}

export async function fetchIcsBody(url: string): Promise<string> {
  assertFetchableUrl(url);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/calendar,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Téléchargement iCal : HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text || text.length > 3_000_000) {
    throw new Error("Réponse iCal vide ou trop volumineuse.");
  }
  return text;
}

/**
 * Synchronise un canal iCal : upsert `calendar_events` liés au canal, annule ceux absents du flux.
 */
export async function syncPropertyChannel(
  supabase: SupabaseClient,
  channel: ChannelRow,
): Promise<{ imported: number; cancelled: number }> {
  const ics = await fetchIcsBody(channel.ical_url);
  const parsed = parseIcsEvents(ics);
  const feedUids = new Set(parsed.map((p) => p.uid));

  const { data: existing, error: exErr } = await supabase
    .from("calendar_events")
    .select("id, external_uid, status")
    .eq("channel_id", channel.id);

  if (exErr) throw new Error(exErr.message);

  const existingByUid = new Map((existing ?? []).map((r) => [r.external_uid as string, r]));

  let imported = 0;
  let cancelled = 0;
  const now = new Date().toISOString();
  const source = channel.platform;

  for (const p of parsed) {
    const status = p.cancelledInFeed ? "cancelled" : "confirmed";
    const prev = existingByUid.get(p.uid);
    const payload = {
      property_id: channel.property_id,
      channel_id: channel.id,
      start_date: p.start,
      end_date: p.endExclusive,
      source,
      external_uid: p.uid,
      status,
      updated_at: now,
    };

    if (prev) {
      const { error: upErr } = await supabase
        .from("calendar_events")
        .update(payload as never)
        .eq("id", prev.id as string);
      if (upErr) throw new Error(upErr.message);
      if (status === "confirmed") imported += 1;
      else cancelled += prev.status !== "cancelled" ? 1 : 0;
    } else {
      const { error: insErr } = await supabase.from("calendar_events").insert(payload as never);
      if (insErr) throw new Error(insErr.message);
      if (status === "confirmed") imported += 1;
      else cancelled += 1;
    }
  }

  for (const row of existing ?? []) {
    const uid = row.external_uid as string;
    if (feedUids.has(uid)) continue;
    if (row.status === "cancelled") continue;
    const { error: cErr } = await supabase
      .from("calendar_events")
      .update({ status: "cancelled", updated_at: now } as never)
      .eq("id", row.id as string);
    if (cErr) throw new Error(cErr.message);
    cancelled += 1;
  }

  return { imported, cancelled };
}

export async function updateChannelAfterSync(
  supabase: SupabaseClient,
  channelId: string,
  ok: boolean,
  errorMessage: string | null,
) {
  if (ok) {
    const { error } = await supabase
      .from("property_channels")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
        error_count: 0,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", channelId);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: row } = await supabase
    .from("property_channels")
    .select("error_count")
    .eq("id", channelId)
    .maybeSingle();

  const nextCount = Number((row as { error_count?: number } | null)?.error_count ?? 0) + 1;
  const { error } = await supabase
    .from("property_channels")
    .update({
      last_error: errorMessage ?? "Erreur inconnue",
      error_count: nextCount,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", channelId);
  if (error) throw new Error(error.message);
}
