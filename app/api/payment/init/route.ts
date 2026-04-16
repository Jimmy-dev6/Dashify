import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingId, amount, customerName, customerEmail, customerPhone } = body;

  if (!bookingId || !amount) {
    return NextResponse.json({ error: "bookingId et amount requis" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactionId = `DASHIFY-${bookingId.slice(0, 8)}-${Date.now()}`;

  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID || "0",
    transaction_id: transactionId,
    amount: Math.round(amount),
    currency: "XOF",
    description: `Réservation Dashify #${bookingId.slice(0, 8)}`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings?payment=success`,
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/notify`,
    customer_name: customerName || "Client",
    customer_email: customerEmail || "client@dashify.app",
    customer_phone_number: customerPhone || "",
    customer_address: "Dakar",
    customer_city: "Dakar",
    customer_country: "SN",
    customer_state: "SN",
    customer_zip_code: "00000",
    channels: "ALL",
    lang: "fr",
    metadata: JSON.stringify({ bookingId, userId: user.id }),
  };

  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.code !== "201") {
    console.error("[CinetPay init error]", JSON.stringify(data));
    return NextResponse.json({ error: data.message || "Erreur CinetPay", details: data }, { status: 500 });
  }

  await supabase
    .from("bookings")
    .update({ payment_transaction_id: transactionId })
    .eq("id", bookingId);

  return NextResponse.json({
    ok: true,
    paymentUrl: data.data.payment_url,
    transactionId,
  });
}