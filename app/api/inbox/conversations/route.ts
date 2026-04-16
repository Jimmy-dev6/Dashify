import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ConversationRow = {
  key: string;
  customer_id: string;
  property_id: string | null;
  platform: string;
  preview: string;
  last_at: string;
  unread: number;
  customer_name: string;
  property_name: string | null;
};

function convKey(customerId: string, propertyId: string | null, platform: string) {
  return `${customerId}|${propertyId ?? ""}|${platform}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platformFilter = (searchParams.get("platform") ?? "").trim().toLowerCase();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("messages")
    .select(
      "id,customer_id,property_id,platform,direction,content,is_read,created_at",
    )
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(600);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    customer_id: string | null;
    property_id: string | null;
    platform: string;
    direction: string;
    content: string;
    is_read: boolean;
    created_at: string;
  };

  const list = (rows ?? []) as Row[];

  const customerIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean))) as string[];
  const propertyIds = Array.from(new Set(list.map((r) => r.property_id).filter(Boolean))) as string[];

  const [{ data: custRows }, { data: propRows }] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id,name").eq("user_id", userData.user.id).in("id", customerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    propertyIds.length
      ? supabase.from("properties").select("id,name").eq("user_id", userData.user.id).in("id", propertyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const customerNameById = new Map((custRows ?? []).map((c) => [String(c.id), String(c.name ?? "")]));
  const propertyNameById = new Map((propRows ?? []).map((p) => [String(p.id), String(p.name ?? "")]));

  const map = new Map<string, ConversationRow>();

  for (const r of list) {
    if (!r.customer_id) continue;
    if (platformFilter && r.platform !== platformFilter) continue;

    const customerName = customerNameById.get(r.customer_id) || "Client";
    const propertyName = r.property_id ? propertyNameById.get(r.property_id) || null : null;

    if (q) {
      const hay = `${customerName} ${propertyName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const key = convKey(r.customer_id, r.property_id, r.platform);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        customer_id: r.customer_id,
        property_id: r.property_id,
        platform: r.platform,
        preview: r.content.slice(0, 160),
        last_at: r.created_at,
        unread: r.direction === "inbound" && !r.is_read ? 1 : 0,
        customer_name: customerName,
        property_name: propertyName,
      });
    } else {
      if (r.direction === "inbound" && !r.is_read) {
        existing.unread += 1;
      }
    }
  }

  const conversations = Array.from(map.values()).sort((a, b) =>
    a.last_at < b.last_at ? 1 : -1,
  );

  return NextResponse.json({ conversations });
}
