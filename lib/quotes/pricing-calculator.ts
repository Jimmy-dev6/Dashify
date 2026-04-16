export type PricingInput = {
  basePricePerNight: number;
  cleaningFee: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  minStay?: number;
  maxStay?: number;
  customPricePerNight?: number;
  discount?: number;
  extraFees?: number;
};

export type PricingBreakdown = {
  nights: number;
  subtotal: number;
  cleaning_fee: number;
  extra_fees: number;
  discount: number;
  total: number;
  formattedTotal: string;
};

function parseISODate(d: string): Date {
  const x = new Date(d + "T12:00:00.000Z");
  if (Number.isNaN(x.getTime())) {
    throw new Error("Date invalide");
  }
  return x;
}

export function calculatePrice(input: PricingInput): PricingBreakdown {
  const start = parseISODate(input.checkIn);
  const end = parseISODate(input.checkOut);
  if (end <= start) {
    throw new Error("La date de départ doit être après l’arrivée");
  }

  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (nights < 1) {
    throw new Error("Durée minimale : 1 nuit");
  }

  if (input.minStay != null && nights < input.minStay) {
    throw new Error(`Durée minimale : ${input.minStay} nuit(s)`);
  }
  if (input.maxStay != null && nights > input.maxStay) {
    throw new Error(`Durée maximale : ${input.maxStay} nuit(s)`);
  }

  const rate = input.customPricePerNight ?? input.basePricePerNight;
  const subtotal = rate * nights;
  const cleaning_fee = input.cleaningFee;
  const extra_fees = input.extraFees ?? 0;
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal + cleaning_fee + extra_fees - discount);

  return {
    nights,
    subtotal,
    cleaning_fee,
    extra_fees,
    discount,
    total,
    formattedTotal: new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(total),
  };
}
