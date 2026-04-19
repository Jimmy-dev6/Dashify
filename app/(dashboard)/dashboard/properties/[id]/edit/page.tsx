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
    .select(
      "id,name,city,base_price,cleaning_fee,currency,description,internal_name,address,neighborhood,property_type,surface_m2,max_guests,bedrooms,beds,bathrooms,amenities",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard/properties");
  }

  const action = updateProperty.bind(null, id);

  // amenities peut être un jsonb (array) ou null
  const amenities = Array.isArray(data.amenities)
    ? data.amenities.filter((x): x is string => typeof x === "string")
    : [];

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
        description: data.description,
        internal_name: data.internal_name,
        address: data.address,
        neighborhood: data.neighborhood,
        property_type: data.property_type,
        surface_m2: data.surface_m2,
        max_guests: data.max_guests,
        bedrooms: data.bedrooms,
        beds: data.beds,
        bathrooms: data.bathrooms,
        amenities,
      }}
    />
  );
}