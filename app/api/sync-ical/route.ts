import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ChannelRow } from "@/lib/ical/sync-channel";
import { syncPropertyChannel, updateChannelAfterSync } from "@/lib/ical/sync-channel";

async function loadChannel(supabase: ReturnType<typeof createClient>, channelId: string) {
  const { data, error } = await supabase
    .from("property_channels")
    .select("id, property_id, platform, ical_url, is_active, error_count")
    .eq("id", channelId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as ChannelRow;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = (searchParams.get("channelId") ?? "").trim();
  if (!channelId) {
    return NextResponse.json({ error: "Paramètre channelId requis." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channel = await loadChannel(supabase, channelId);
    if (!channel) {
      return NextResponse.json({ error: "Canal introuvable." }, { status: 404 });
    }

    const { imported, cancelled } = await syncPropertyChannel(supabase, channel);
    await updateChannelAfterSync(supabase, channelId, true, null);

    return NextResponse.json({ ok: true, imported, cancelled });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await updateChannelAfterSync(supabase, channelId, false, msg);
    } catch {
      /* ignore */
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

type PostBody = { all?: boolean };

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body.all) {
    return NextResponse.json({ error: "Body { \"all\": true } requis pour tout synchroniser." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("property_channels")
    .select("id, property_id, platform, ical_url, is_active, error_count")
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const channels = (rows ?? []) as ChannelRow[];

  let totalImported = 0;
  let totalCancelled = 0;
  const errors: string[] = [];

  for (const ch of channels) {
    try {
      const { imported, cancelled } = await syncPropertyChannel(supabase, ch);
      totalImported += imported;
      totalCancelled += cancelled;
      await updateChannelAfterSync(supabase, ch.id, true, null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${ch.id}: ${msg}`);
      try {
        await updateChannelAfterSync(supabase, ch.id, false, msg);
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    channels: channels.length,
    imported: totalImported,
    cancelled: totalCancelled,
    errors: errors.length ? errors : undefined,
  });
}
