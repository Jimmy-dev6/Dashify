export type PaymentLeg = {
  percent: number;
  at_booking?: boolean;
  days_before_checkin?: number | null;
};

export type CancellationType = "non_refundable" | "flexible" | "moderate";
export type DepositType = "none" | "fixed" | "percent";

export type PolicyRow = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  payment_schedule: PaymentLeg[] | unknown;
  cancellation_type: CancellationType;
  cancellation_days: number;
  cancellation_percent: number;
  deposit_type: DepositType;
  deposit_value: number;
  quote_expiry_hours: number;
  created_at?: string;
};
