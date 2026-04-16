import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./calendar-view";

type PropertyRow = {
  id: string;
  name: string;
  base_price: number | null;
  cleaning_fee: number | null;
  currency: string | null;
};

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("properties")
    .select("id,name,base_price,cleaning_fee,currency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const properties = ((data ?? []) as PropertyRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    base_price: Number(p.base_price ?? 0),
    cleaning_fee: Number(p.cleaning_fee ?? 0),
    currency: p.currency ?? "XOF",
  }));

  return (
    <div>
      <PageHeader
        title="Calendrier"
        description="Visualisez vos disponibilités et créez des devis en quelques clics."
      />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error.message}
        </div>
      ) : (
        <CalendarView properties={properties} />
      )}
    </div>
  );
}
