import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuotesView } from "./quotes-view";

type PropertyRow = {
  id: string;
  name: string;
  base_price: number | null;
  cleaning_fee: number | null;
  currency: string | null;
};

export default async function DashboardQuotesPage({
  searchParams,
}: {
  searchParams?: { quote?: string; new?: string; customerId?: string };
}) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("properties")
    .select("id,name,base_price,cleaning_fee,currency")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  const properties = ((data ?? []) as PropertyRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    base_price: Number(p.base_price ?? 0),
    cleaning_fee: Number(p.cleaning_fee ?? 0),
    currency: p.currency ?? "XOF",
  }));

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error.message}
      </div>
    );
  }

  return (
    <QuotesView
      properties={properties}
      initialQuoteId={searchParams?.quote?.trim() || null}
      initialNewModal={searchParams?.new === "1"}
      prefillCustomerId={searchParams?.customerId?.trim() || null}
    />
  );
}
