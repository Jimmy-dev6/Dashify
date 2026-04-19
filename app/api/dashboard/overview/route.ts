import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// ----- Fenêtre : 3 mois passés + mois courant + 2 mois futurs (6 mois total)
const now = new Date();
const windowStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
const windowEnd = new Date(now.getFullYear(), now.getMonth() + 3, 1);
const startIso = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, "0")}-01`;
const endIso = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, "0")}-01`;

const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("id,check_in,check_out,total,status,customer:customers(id,name),property:properties(id,name)")
    .eq("user_id", user.id)
    .gte("check_in", startIso)
    .lt("check_in", endIso)
    .order("check_in", { ascending: true });

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

// ----- Revenus par mois (basé sur check_in, statuts confirmed/completed)
const revenueByMonth: Record<string, number> = {};
for (let i = -3; i <= 2; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  revenueByMonth[key] = 0;
}

  for (const b of bookings ?? []) {
    if (b.status !== "confirmed" && b.status !== "completed") continue;
    const key = b.check_in.substring(0, 7);
    if (key in revenueByMonth) {
      revenueByMonth[key] += Number(b.total ?? 0);
    }
  }

  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const revenueSeries = Object.entries(revenueByMonth).map(([key, revenue]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      month: `${monthNames[m - 1]} ${String(y).slice(-2)}`,
      revenue,
      key,
    };
  });

  // ----- Prochaines arrivées (3 prochaines confirmées, check_in >= aujourd'hui)
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  type BookingRow = {
    id: string;
    check_in: string;
    check_out: string;
    total: number;
    status: string;
    customer: { id: string; name: string } | { id: string; name: string }[] | null;
    property: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const upcomingArrivals = (bookings as unknown as BookingRow[] ?? [])
    .filter((b) => b.status === "confirmed" && b.check_in >= todayIso)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      check_in: b.check_in,
      check_out: b.check_out,
      total: b.total,
      customer: Array.isArray(b.customer) ? (b.customer[0] ?? null) : b.customer,
      property: Array.isArray(b.property) ? (b.property[0] ?? null) : b.property,
    }));

  return NextResponse.json({
    revenueSeries,
    upcomingArrivals,
  });
}
