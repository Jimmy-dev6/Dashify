function fromIsoLocal(s: string) {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function dayLabelFr(iso: string) {
  return fromIsoLocal(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dayLabelForLang(iso: string, lang: "fr" | "en") {
  const loc = lang === "en" ? "en-US" : "fr-FR";
  return fromIsoLocal(iso).toLocaleDateString(loc, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut || checkIn >= checkOut) return 0;
  const a = fromIsoLocal(checkIn);
  const b = fromIsoLocal(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

export function formatMoneyFr(amount: number, currency = "XOF") {
  return formatMoney(amount, currency, "fr");
}

export function formatMoney(amount: number, currency = "XOF", lang: "fr" | "en" = "fr") {
  const loc = lang === "en" ? "en-US" : "fr-FR";
  return `${Math.round(amount).toLocaleString(loc)} ${currency}`;
}

export function clampQuoteValidityHours(h: number | null | undefined) {
  const n = Number(h);
  if (Number.isFinite(n) && n > 0 && n <= 168) return Math.round(n);
  return 48;
}

export function buildQuoteWhatsAppMessage(params: {
  customerName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companyLogo?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  companyAddress?: string | null;
  quoteValidityHours?: number | null;
  language?: string | null;
  /** Texte déjà formaté (ex. politique de réservation), affiché après la validité du devis. */
  policyConditionsBlock?: string | null;
  /** Lignes supplémentaires (frais, suppléments, promo) insérées après le total, avant la validité. */
  pricingExtrasLines?: string[] | null;
}) {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const cur = (params.currency ?? "XOF").trim() || "XOF";
  const lang: "fr" | "en" = params.language?.toLowerCase() === "en" ? "en" : "fr";
  const totalFormatted = formatMoney(Number(params.total ?? 0), cur, lang);
  const ci = dayLabelForLang(params.checkIn, lang);
  const co = dayLabelForLang(params.checkOut, lang);
  const hours = clampQuoteValidityHours(params.quoteValidityHours);

  const intro =
    lang === "en"
      ? `Hello ${params.customerName}, here is your quote for ${params.propertyName}:`
      : `Bonjour ${params.customerName}, voici votre devis pour ${params.propertyName} :`;

  const dates =
    lang === "en"
      ? `📅 From ${ci} to ${co} (${nights} night${nights > 1 ? "s" : ""})`
      : `📅 Du ${ci} au ${co} (${nights} nuit${nights > 1 ? "s" : ""})`;

  const guestsLine =
    lang === "en"
      ? `👥 ${params.guests} guest${params.guests > 1 ? "s" : ""}`
      : `👥 ${params.guests} voyageur${params.guests > 1 ? "s" : ""}`;

  const totalLine =
    lang === "en" ? `💰 Total: ${totalFormatted}` : `💰 Total : ${totalFormatted}`;

  const extras = (params.pricingExtrasLines ?? []).map((s) => String(s).trim()).filter(Boolean);

  const validity =
    lang === "en"
      ? `This quote is valid for ${hours}h. Reply YES to confirm.`
      : `Ce devis est valable ${hours}h. Répondez OUI pour confirmer.`;

  const lines = [intro, dates, guestsLine, totalLine, ...extras, validity];

  const policyBlock = (params.policyConditionsBlock ?? "").trim();
  if (policyBlock) {
    lines.push(
      lang === "en" ? `📋 Terms: ${policyBlock}` : `📋 Conditions : ${policyBlock}`,
    );
  }

  const company = (params.companyName ?? "").trim();
  const site = (params.companyWebsite ?? "").trim();
  const logo = (params.companyLogo ?? "").trim();
  const city = (params.companyCity ?? "").trim();
  const country = (params.companyCountry ?? "").trim();
  const address = (params.companyAddress ?? "").trim();

  if (company || site || logo || city || country || address) {
    if (lang === "en") {
      lines.push("—");
      if (company) lines.push(company);
      if (address) lines.push(address);
      const loc = [city, country].filter(Boolean).join(", ");
      if (loc) lines.push(loc);
      if (site) lines.push(site);
      if (logo) lines.push(`Logo: ${logo}`);
    } else {
      lines.push("—");
      if (company) lines.push(company);
      if (address) lines.push(address);
      const loc = [city, country].filter(Boolean).join(", ");
      if (loc) lines.push(loc);
      if (site) lines.push(`🌐 ${site}`);
      if (logo) lines.push(`Logo : ${logo}`);
    }
  }

  return lines.join("\n");
}
