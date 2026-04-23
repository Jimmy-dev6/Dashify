import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentView } from "./payment-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { reference: string };
};

export async function generateMetadata({ params }: PageProps) {
  return {
    title: "Paiement " + params.reference.toUpperCase() + " - Dashify",
    description: "Page de paiement securisee.",
    robots: "noindex, nofollow",
  };
}

function isValidReference(ref: string): boolean {
  return /^DSHF-[0-9A-F]{8}$/i.test(ref.trim());
}

export default async function PaymentPage({ params }: PageProps) {
  const reference = params.reference.toUpperCase();

  if (!isValidReference(reference)) {
    notFound();
  }

  const supabase = createClient();

  const { data: quote, error: quoteErr } = await supabase
    .from("quotes")
    .select(
      "id, user_id, property_id, customer_id, check_in, check_out, guests, total, status, expires_at, payment_confirmed_at, payment_method_used, payment_reference",
    )
    .eq("payment_reference", reference)
    .maybeSingle();

  if (quoteErr || !quote) {
    notFound();
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, city, cover_image_url, base_price, currency")
    .eq("id", quote.property_id)
    .maybeSingle();

  const { data: host } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, company_name, company_logo, payment_orange_money, payment_wave, payment_free_money, payment_holder_name, payment_instructions_extra",
    )
    .eq("id", quote.user_id)
    .maybeSingle();

  if (!property || !host) {
    notFound();
  }

  const now = new Date();
  const expiresAt = quote.expires_at ? new Date(quote.expires_at) : null;
  const isExpired =
    quote.status === "expired" ||
    quote.status === "refused" ||
    (expiresAt !== null && expiresAt < now && !quote.payment_confirmed_at);
  const isPaid =
    quote.status === "accepted" || quote.payment_confirmed_at !== null;

  return (
    <PaymentView
      reference={quote.payment_reference}
      quote={{
        id: quote.id,
        checkIn: quote.check_in,
        checkOut: quote.check_out,
        guests: quote.guests ?? 1,
        total: Number(quote.total ?? 0),
        expiresAt: quote.expires_at,
      }}
      property={{
        name: property.name ?? "Logement",
        city: property.city ?? "",
        coverImageUrl: property.cover_image_url,
        currency: property.currency ?? "XOF",
      }}
      host={{
        fullName: host.full_name ?? "",
        phone: host.phone ?? "",
        companyName: host.company_name ?? "",
        companyLogo: host.company_logo,
        paymentOrangeMoney: host.payment_orange_money,
        paymentWave: host.payment_wave,
        paymentFreeMoney: host.payment_free_money,
        paymentHolderName: host.payment_holder_name ?? "",
        paymentInstructionsExtra: host.payment_instructions_extra ?? "",
      }}
      state={isPaid ? "paid" : isExpired ? "expired" : "active"}
    />
  );
}