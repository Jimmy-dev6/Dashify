export type InboxPlatform = "whatsapp" | "airbnb" | "booking" | "dashify";

/**
 * Enregistre un message sortant (ex. après ouverture wa.me depuis Dashify).
 * Ne bloque pas l’UI en cas d’échec réseau.
 */
export async function logOutboundMessage(params: {
  customerId: string;
  propertyId: string | null;
  platform: InboxPlatform;
  content: string;
  external_url?: string | null;
  is_note?: boolean;
}) {
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: params.customerId,
        propertyId: params.propertyId,
        platform: params.platform,
        direction: "outbound",
        content: params.content,
        external_url: params.external_url ?? null,
        is_note: params.is_note ?? false,
      }),
    });

    if (!res.ok) {
      let extra = "";
      try {
        const json = (await res.json()) as { error?: string };
        extra = json.error ? ` (${json.error})` : "";
      } catch {
        /* ignore */
      }
      console.error("[logOutboundMessage] /api/messages failed", res.status, extra, {
        customerId: params.customerId,
        propertyId: params.propertyId,
        platform: params.platform,
        contentLen: params.content.length,
      });
    }
  } catch {
    console.error("[logOutboundMessage] network error", {
      customerId: params.customerId,
      propertyId: params.propertyId,
      platform: params.platform,
      contentLen: params.content.length,
    });
  }
}
