import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PoliciesView } from "./policies-view";

export default async function PoliciesPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");

  return <PoliciesView />;
}
