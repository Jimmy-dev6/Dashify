import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "../../property-form";
import { updateProperty } from "../../actions";

type Params = { id: string };

export default async function EditPropertyPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("properties")
    .select("id,name,city,base_price,cleaning_fee,currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard/properties");
  }

  const action = updateProperty.bind(null, id);

  return (
    <PropertyForm
      title="Éditer le logement"
      description="Mettez à jour les informations et les prix."
      submitLabel="Enregistrer"
      action={action}
      defaultValues={{
        name: data.name,
        city: data.city,
        base_price: data.base_price,
        cleaning_fee: data.cleaning_fee,
        currency: data.currency,
      }}
    />
  );
}

