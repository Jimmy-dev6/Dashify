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

/**
 * Formatte un numero mobile money sénégalais (9 chiffres commençant par 7)
 * vers un affichage international lisible.
 */
function formatMobileMoneyDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+221 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return String(raw);
}

/**
 * Construit le bloc paiement dans le message WhatsApp.
 * Retourne une chaine vide si aucun moyen de paiement n'est configuré.
 */
export function buildPaymentBlock(params: {
  lang: "fr" | "en";
  paymentReference: string | null;
  paymentUrl: string | null;
  paymentOrangeMoney: string | null;
  paymentWave: string | null;
  paymentFreeMoney: string | null;
  paymentHolderName: string | null;
  paymentInstructionsExtra: string | null;
}): string {
  const hasAny =
    params.paymentOrangeMoney || params.paymentWave || params.paymentFreeMoney;
  if (!hasAny) return "";

  const lines: string[] = [];
  const lang = params.lang;

  // Titre
  lines.push("");
  lines.push(lang === "en" ? "💳 Pay online:" : "💳 Paiement en ligne :");

  // Lien vers la page de paiement Dashify
  if (params.paymentUrl) {
    lines.push(params.paymentUrl);
  }

  // Séparateur
  lines.push("");
  lines.push(lang === "en" ? "Or directly to:" : "Ou directement sur :");

  if (params.paymentOrangeMoney) {
    lines.push(`🟠 Orange Money : ${formatMobileMoneyDisplay(params.paymentOrangeMoney)}`);
  }
  if (params.paymentWave) {
    lines.push(`🌊 Wave : ${formatMobileMoneyDisplay(params.paymentWave)}`);
  }
  if (params.paymentFreeMoney) {
    lines.push(`🔴 Free Money : ${formatMobileMoneyDisplay(params.paymentFreeMoney)}`);
  }

  const holder = (params.paymentHolderName ?? "").trim();
  if (holder) {
    lines.push(lang === "en" ? `Account holder: ${holder}` : `Au nom de : ${holder}`);
  }

  // Référence
  if (params.paymentReference) {
    lines.push("");
    lines.push(
      lang === "en"
        ? `⚠️ Reference to mention: ${params.paymentReference}`
        : `⚠️ Référence à mentionner : ${params.paymentReference}`,
    );
  }

  // Instructions extra
  const extra = (params.paymentInstructionsExtra ?? "").trim();
  if (extra) {
    lines.push("");
    lines.push(extra);
  }

  return lines.join("\n");
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
  /** Référence unique du devis (ex: DSHF-XXXXXXXX), générée à l'INSERT. */
  paymentReference?: string | null;
  /** URL complète vers la page publique de paiement (ex: https://dashify-plum.vercel.app/pay/DSHF-XXXX). */
  paymentUrl?: string | null;
  /** Numéro mobile money de l'hôte (9 chiffres format 7XXXXXXXX) ou null. */
  paymentOrangeMoney?: string | null;
  paymentWave?: string | null;
  paymentFreeMoney?: string | null;
  paymentHolderName?: string | null;
  paymentInstructionsExtra?: string | null;
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

  // Bloc paiement (Phase 2 Palier 4)
  const paymentBlock = buildPaymentBlock({
    lang,
    paymentReference: params.paymentReference ?? null,
    paymentUrl: params.paymentUrl ?? null,
    paymentOrangeMoney: params.paymentOrangeMoney ?? null,
    paymentWave: params.paymentWave ?? null,
    paymentFreeMoney: params.paymentFreeMoney ?? null,
    paymentHolderName: params.paymentHolderName ?? null,
    paymentInstructionsExtra: params.paymentInstructionsExtra ?? null,
  });
  if (paymentBlock) {
    lines.push(paymentBlock);
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
