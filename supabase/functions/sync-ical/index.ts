/**
 * Edge Function `sync-ical` (Deno) — fetch iCal, parse, upsert `calendar_events`.
 * Invoquée par pg_cron (ex. toutes les 30 min). User-Agent : Dashify/1.0
 */
Deno.serve((_req) => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "sync-ical : squelette — brancher fetch, node-ical, upsert Supabase",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
