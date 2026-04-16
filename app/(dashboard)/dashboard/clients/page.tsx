import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientsView } from "./clients-view";

export default async function DashboardClientsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  return <ClientsView />;
}
