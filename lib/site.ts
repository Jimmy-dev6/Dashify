// Constantes centrales du site Dashify.
// Si un jour on a besoin de switcher URL en preview Vercel,
// definir NEXT_PUBLIC_SITE_URL dans les env vars Vercel.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dashify.africa";

export const SITE_NAME = "Dashify";

export const SITE_DESCRIPTION =
  "SaaS de gestion de locations courte duree pour hotes ouest-africains. Mobile Money, calendrier, evenements locaux, devis WhatsApp.";

export const AUTHOR_NAME = "Jimmy Khater";

export const PUBLISHER_LOGO = `${SITE_URL}/logo.png`;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const SITE_LOCALE = "fr_FR";