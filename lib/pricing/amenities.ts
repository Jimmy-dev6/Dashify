/** Identifiants d’équipements (cohérents avec JSON `properties.amenities`). */

export const AMENITY_IDS = [
  "ac",
  "pool",
  "wifi",
  "generator",
  "guard24",
  "parking",
  "kitchen",
  "sea_view",
  "terrace",
  "jacuzzi",
] as const;

export type AmenityId = (typeof AMENITY_IDS)[number];

export const AMENITY_LABELS: Record<AmenityId, string> = {
  ac: "Climatisation",
  pool: "Piscine",
  wifi: "Wifi",
  generator: "Groupe électrogène",
  guard24: "Gardien 24h",
  parking: "Parking",
  kitchen: "Cuisine équipée",
  sea_view: "Vue mer",
  terrace: "Terrasse",
  jacuzzi: "Jacuzzi",
};

const WEIGHT: Record<AmenityId, number> = {
  jacuzzi: 2,
  pool: 2,
  sea_view: 2,
  generator: 2,
  guard24: 2,
  ac: 1.5,
  kitchen: 1.5,
  terrace: 1,
  parking: 1,
  wifi: 0.5,
};

const STAR_MULT = [0.85, 0.95, 1.0, 1.15, 1.3] as const;

export function normalizeAmenities(raw: unknown): AmenityId[] {
  if (!Array.isArray(raw)) return [];
  const out: AmenityId[] = [];
  for (const x of raw) {
    const s = String(x).trim();
    if ((AMENITY_IDS as readonly string[]).includes(s)) out.push(s as AmenityId);
  }
  return out;
}

/** 1–5 étoiles à partir des équipements cochés. */
export function computeQualityStars(amenities: AmenityId[]): 1 | 2 | 3 | 4 | 5 {
  if (amenities.length === 0) return 1;
  let pts = 0;
  for (const a of amenities) pts += WEIGHT[a] ?? 1;
  const stars = Math.min(5, Math.max(1, Math.round(pts / 2.2)));
  return stars as 1 | 2 | 3 | 4 | 5;
}

export function starsToQualityMultiplier(stars: 1 | 2 | 3 | 4 | 5): number {
  return STAR_MULT[stars - 1] ?? 1;
}

export function computeQualityMultiplierFromAmenities(amenities: AmenityId[]): number {
  return starsToQualityMultiplier(computeQualityStars(amenities));
}
