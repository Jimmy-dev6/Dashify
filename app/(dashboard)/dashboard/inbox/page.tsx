import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InboxView } from "./inbox-view";

type PropertyMini = { id: string; name: string };

export default async function DashboardInboxPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("properties")
    .select("id,name")
    .eq("user_id", userData.user.id)
    .order("name", { ascending: true });

  const properties = ((data ?? []) as PropertyMini[]) ?? [];

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error.message}
      </div>
    );
  }

  return <InboxView properties={properties} />;
}
