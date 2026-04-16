export type WhatsAppTemplateLocale = "fr" | "en";

export type WhatsAppTemplateData = {
  locale: WhatsAppTemplateLocale;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  breakdownLines: string[];
  total: string;
  expiresAtLabel: string;
};

export function generateWhatsAppMessage(data: WhatsAppTemplateData): string {
  const isFr = data.locale === "fr";
  const greet = isFr ? "Bonjour 👋" : "Hello 👋";
  const stay = isFr ? "Logement" : "Property";
  const dates = isFr ? "Dates" : "Dates";
  const guests = isFr ? "Voyageurs" : "Guests";
  const detail = isFr ? "Détail" : "Breakdown";
  const total = isFr ? "*Total*" : "*Total*";
  const exp = isFr ? "Ce devis expire le" : "This quote expires on";
  const reply = isFr
    ? "Répondez *OUI* pour confirmer."
    : "Reply *YES* to confirm.";

  const lines = [
    greet,
    "",
    `*${stay}* : ${data.propertyName}`,
    `*${dates}* : ${data.checkIn} → ${data.checkOut}`,
    `*${guests}* : ${data.guests}`,
    "",
    `*${detail}*`,
    ...data.breakdownLines.map((l) => `• ${l}`),
    "",
    `${total} : *${data.total}*`,
    "",
    `${exp} ${data.expiresAtLabel}.`,
    reply,
  ];

  return lines.join("\n");
}
