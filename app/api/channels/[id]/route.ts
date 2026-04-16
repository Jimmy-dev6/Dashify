import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: channel, error: cErr } = await supabase
    .from("property_channels")
    .select("id,property_id")
    .eq("id", id)
    .maybeSingle();

  if (cErr || !channel) {
    return NextResponse.json({ error: "Canal introuvable." }, { status: 404 });
  }

  const { error: delEv } = await supabase.from("calendar_events").delete().eq("channel_id", id);
  if (delEv) return NextResponse.json({ error: delEv.message }, { status: 500 });

  const { error: delCh } = await supabase.from("property_channels").delete().eq("id", id);
  if (delCh) return NextResponse.json({ error: delCh.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
