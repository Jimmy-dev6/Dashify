import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingView } from "./pricing-view";

export default async function PricingPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");

  return <PricingView />;
}
