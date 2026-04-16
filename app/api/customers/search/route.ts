import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "8"), 1), 20);

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!q) {
    return NextResponse.json({ customers: [] });
  }

  const pattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const { data: byName, error: e1 } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("user_id", userData.user.id)
    .ilike("name", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  const { data: byPhone, error: e2 } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("user_id", userData.user.id)
    .ilike("phone", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const { data: byEmail, error: e3 } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("user_id", userData.user.id)
    .ilike("email", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (e3) {
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  const merged = new Map<string, { id: string; name: string; phone: string }>();
  for (const c of [...(byName ?? []), ...(byPhone ?? []), ...(byEmail ?? [])]) {
    merged.set(c.id, c);
  }
  const customers = Array.from(merged.values()).slice(0, limit);

  return NextResponse.json({ customers });
}

