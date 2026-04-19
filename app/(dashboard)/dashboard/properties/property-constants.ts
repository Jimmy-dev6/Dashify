export const AMENITIES_LIST = [
    { id: "wifi", label: "Wi-Fi", category: "Essentiels" },
    { id: "parking", label: "Parking", category: "Essentiels" },
    { id: "airconditioning", label: "Climatisation", category: "Essentiels" },
    { id: "kitchen", label: "Cuisine équipée", category: "Essentiels" },
    { id: "washing_machine", label: "Lave-linge", category: "Essentiels" },
    { id: "tv", label: "Télévision", category: "Confort" },
    { id: "terrace", label: "Terrasse", category: "Confort" },
    { id: "balcony", label: "Balcon", category: "Confort" },
    { id: "pool", label: "Piscine", category: "Confort" },
    { id: "safe", label: "Coffre-fort", category: "Sécurité" },
    { id: "smoke_detector", label: "Détecteur de fumée", category: "Sécurité" },
    { id: "first_aid", label: "Kit premiers secours", category: "Sécurité" },
    { id: "cleaning", label: "Service de ménage", category: "Services" },
    { id: "breakfast", label: "Petit-déjeuner", category: "Services" },
    { id: "airport_transfer", label: "Transfert aéroport", category: "Services" },
    { id: "baby_cot", label: "Lit bébé disponible", category: "Famille" },
  ] as const;
  
  export const VALID_AMENITY_IDS = new Set(AMENITIES_LIST.map((a) => a.id));