export type SeasonRule = {
  start: string;
  end: string;
  kind: "high" | "low";
  multiplier: number;
};

export type PricingRulesRow = {
  id: string;
  property_id: string;
  user_id: string;
  is_active: boolean;
  min_price: number;
  max_price: number;
  weekend_multiplier: number;
  lastminute_days: number;
  lastminute_discount: number;
  high_occupancy_threshold: number;
  high_occupancy_multiplier: number;
  low_occupancy_threshold: number;
  low_occupancy_multiplier: number;
  seasons: SeasonRule[];
  long_stay_7_discount: number;
  long_stay_14_discount: number;
  long_stay_30_discount: number;
  early_bird_days: number;
  early_bird_multiplier: number;
  quality_multiplier: number;
  use_local_events: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PricingDetailJson = {
  currency: string;
  lines: string[];
  nights_count: number;
  nightly_subtotal: number;
  cleaning_fee: number;
  last_minute_applied: boolean;
  total: number;
};

export type QuotePreviewResult = {
  active: boolean;
  currency: string;
  total: number;
  nightly_subtotal: number;
  cleaning_fee: number;
  lines: string[];
  /** Détail calcul (aperçu API uniquement, non persisté en base). */
  breakdown: PricingDetailJson | null;
};

export type DayColorTier =
  | "event_major"
  | "event_medium"
  | "occupancy_high"
  | "last_minute"
  | "low_price"
  | "normal";

export type DailyPreviewDay = {
  date: string;
  price: number;
  tier: "high" | "mid" | "low";
  /** Ex. 55 000 × week-end(×1,2) × Tabaski(×1,5) = 99 000 XOF */
  detail?: string;
  color_tier?: DayColorTier;
};

export type MonthPreviewResponse = {
  days: DailyPreviewDay[];
  min: number;
  max: number;
  avg: number;
};
