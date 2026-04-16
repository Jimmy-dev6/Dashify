export type WADeeplinkInput = {
  phone: string;
  message: string;
};

/** Ne garde que les chiffres (E.164 sans le + dans le path wa.me). */
export function normalizeWaPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function buildWADeeplink(input: WADeeplinkInput): string {
  const digits = normalizeWaPhone(input.phone);
  const text = encodeURIComponent(input.message);
  return `https://wa.me/${digits}?text=${text}`;
}
