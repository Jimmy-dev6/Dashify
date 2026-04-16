import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelsView } from "./channels-view";

export default async function DashboardChannelsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  return <ChannelsView />;
}
