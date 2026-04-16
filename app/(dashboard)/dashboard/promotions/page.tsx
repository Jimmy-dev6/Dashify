import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PromotionsView } from "./promotions-view";

export default async function PromotionsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  return <PromotionsView />;
}
