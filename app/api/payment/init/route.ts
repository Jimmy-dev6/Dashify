import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

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

  // Auth CinetPay
  const authRes = await fetch("https://client.cinetpay.com/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      password: process.env.CINETPAY_API_PASSWORD,
    }),
  });
  const authData = await authRes.json();
  console.log("[CinetPay auth]", JSON.stringify(authData).slice(0, 200));

  // Token est dans access_token (pas data.token)
  const token = authData.access_token;
  if (!token) {
    return NextResponse.json({ error: "Auth échouée", details: authData }, { status: 500 });
  }

  // Init paiement
  const nameParts = (customerName || "Client Dashify").split(" ");
  const payRes = await fetch("https://api.cinetpay.net/v1/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      merchant_transaction_id: transactionId,
      amount: Math.round(amount),
      currency: "XOF",
      designation: `Réservation #${bookingId.slice(0, 8)}`,
      lang: "fr",
      client_email: customerEmail || "client@dashify.app",
      client_phone_number: customerPhone || "",
      client_first_name: nameParts[0] || "Client",
      client_last_name: nameParts.slice(1).join(" ") || "Dashify",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings?payment=success`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/notify`,
    }),
  });
  const payData = await payRes.json();
  console.log("[CinetPay payment]", JSON.stringify(payData).slice(0, 200));

  if (!payData.data?.payment_token) {
    return NextResponse.json({ error: payData.message || "Erreur", details: payData }, { status: 500 });
  }

  await supabase.from("bookings").update({ payment_transaction_id: transactionId }).eq("id", bookingId);

  return NextResponse.json({
    ok: true,
    paymentUrl: `https://checkout.cinetpay.com/payment/${payData.data.payment_token}`,
    transactionId,
  });
}