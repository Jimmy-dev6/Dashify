import type { CancellationType, DepositType, PaymentLeg, PolicyRow } from "@/lib/policies/types";

function normalizePaymentSchedule(raw: unknown): PaymentLeg[] {
  if (!Array.isArray(raw)) return [];
  const out: PaymentLeg[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const pct = Number(o.percent);
    if (!Number.isFinite(pct) || pct <= 0) continue;
    const atBooking = Boolean(o.at_booking);
    const daysRaw = o.days_before_checkin;
    const daysNum =
      daysRaw != null && daysRaw !== "" ? Number(daysRaw) : Number.NaN;
    const daysOk = Number.isFinite(daysNum) && daysNum > 0 ? Math.round(daysNum) : null;
    out.push({
      percent: Math.round(pct * 100) / 100,
      at_booking: atBooking,
      days_before_checkin: daysOk,
    });
  }
  return out;
}

function paymentSummaryFr(legs: PaymentLeg[]): string {
  if (legs.length === 0) return "Non défini";
  if (legs.length === 1) {
    const a = legs[0]!;
    return `${a.percent}% à la réservation`;
  }
  const parts = legs.map((leg) => {
    if (leg.at_booking) return `${leg.percent}% à la réservation`;
    if (leg.days_before_checkin != null && leg.days_before_checkin > 0) {
      return `${leg.percent}% au plus tard ${leg.days_before_checkin} j. avant l’arrivée`;
    }
    return `${leg.percent}%`;
  });
  return parts.join(" + ");
}

function cancellationSummaryFr(t: CancellationType, days: number, pct: number): string {
  if (t === "non_refundable") return "Non remboursable";
  if (t === "flexible") {
    return days > 0
      ? `Remboursement intégral si annulation ≥ ${days} j. avant l’arrivée`
      : "Flexible (voir conditions)";
  }
  const p = pct > 0 ? pct : 50;
  return days > 0
    ? `${p}% remboursable si annulation ≥ ${days} j. avant l’arrivée`
    : `Modérée (${p}% selon conditions)`;
}

function depositSummaryFr(
  depositType: DepositType,
  value: number,
  currency: string,
): string {
  if (depositType === "none") return "Aucune caution";
  if (depositType === "fixed") {
    return `Caution fixe ${Math.round(value).toLocaleString("fr-FR")} ${currency}`;
  }
  if (depositType === "percent") return `Caution ${value}% du montant total`;
  return "—";
}

/** Bloc court pour liste / tableau (sans emoji). */
export function formatPolicyTableSummary(policy: PolicyRow, currency = "XOF") {
  const legs = normalizePaymentSchedule(policy.payment_schedule);
  return {
    payment: paymentSummaryFr(legs),
    cancellation: cancellationSummaryFr(
      policy.cancellation_type,
      policy.cancellation_days,
      policy.cancellation_percent,
    ),
    deposit: depositSummaryFr(policy.deposit_type, Number(policy.deposit_value ?? 0), currency),
    quoteExpiry: `${policy.quote_expiry_hours} h`,
  };
}

/**
 * Texte pour message WhatsApp (FR ou EN), sans préfixe emoji (ajouté par le builder devis).
 */
export function formatPolicyConditionsBlock(
  policy: PolicyRow,
  lang: "fr" | "en",
  currency = "XOF",
): string {
  const legs = normalizePaymentSchedule(policy.payment_schedule);
  const payFr = paymentSummaryFr(legs);
  const payEn =
    legs.length === 1
      ? `${legs[0]!.percent}% at booking`
      : legs
          .map((leg) => {
            if (leg.at_booking) return `${leg.percent}% at booking`;
            if (leg.days_before_checkin)
              return `${leg.percent}% at least ${leg.days_before_checkin} days before arrival`;
            return `${leg.percent}%`;
          })
          .join(" + ");

  const canFr = cancellationSummaryFr(
    policy.cancellation_type,
    policy.cancellation_days,
    policy.cancellation_percent,
  );
  const canEn =
    policy.cancellation_type === "non_refundable"
      ? "Non-refundable"
      : policy.cancellation_type === "flexible"
        ? policy.cancellation_days > 0
          ? `Full refund if cancelled ≥ ${policy.cancellation_days} days before arrival`
          : "Flexible"
        : policy.cancellation_days > 0
          ? `${policy.cancellation_percent || 50}% refund if cancelled ≥ ${policy.cancellation_days} days before arrival`
          : "Moderate";

  const depFr = depositSummaryFr(policy.deposit_type, Number(policy.deposit_value ?? 0), currency);
  const depEn =
    policy.deposit_type === "none"
      ? "No security deposit"
      : policy.deposit_type === "fixed"
        ? `Fixed deposit ${Math.round(Number(policy.deposit_value)).toLocaleString("en-US")} ${currency}`
        : `Deposit ${policy.deposit_value}% of total`;

  if (lang === "en") {
    return [
      `Payment: ${payEn}.`,
      `Cancellation: ${canEn}.`,
      `Deposit: ${depEn}.`,
      `Quote valid ${policy.quote_expiry_hours}h.`,
    ].join(" ");
  }
  return [
    `Paiement : ${payFr}.`,
    `Annulation : ${canFr}.`,
    `Caution : ${depFr}.`,
    `Devis valable ${policy.quote_expiry_hours} h.`,
  ].join(" ");
}

export function policyFromRow(row: Record<string, unknown>): PolicyRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name ?? ""),
    is_default: Boolean(row.is_default),
    payment_schedule: row.payment_schedule,
    cancellation_type: (row.cancellation_type as CancellationType) ?? "non_refundable",
    cancellation_days: Number(row.cancellation_days ?? 0),
    cancellation_percent: Number(row.cancellation_percent ?? 0),
    deposit_type: (row.deposit_type as DepositType) ?? "none",
    deposit_value: Number(row.deposit_value ?? 0),
    quote_expiry_hours: Number(row.quote_expiry_hours ?? 48),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
  };
}
