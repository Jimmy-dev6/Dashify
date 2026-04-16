import { PropertyForm } from "../property-form";
import { createProperty } from "../actions";

export default function NewPropertyPage() {
  return (
    <PropertyForm
      title="Nouveau logement"
      description="Créez une propriété et définissez ses paramètres de prix."
      submitLabel="Créer le logement"
      action={createProperty}
    />
  );
}

