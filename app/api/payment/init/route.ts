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
  const authRes = await fetch("https://api.cinetpay.net/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: process.env.CINETPAY_API_KEY, password: process.env.CINETPAY_API_PASSWORD }),
  });
  const authData = await authRes.json();
  if (!authData.data?.token) {
    return NextResponse.json({ error: "Auth CinetPay échouée", details: authData }, { status: 500 });
  }
  const payRes = await fetch("https://api.cinetpay.net/v1/payment/init", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authData.data.token}` },
    body: JSON.stringify({
      transaction_id: transactionId,
      amount: Math.round(amount),
      currency: "XOF",
      description: `Réservation Dashify #${bookingId.slice(0, 8)}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings?payment=success`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/notify`,
      customer_name: customerName || "Client",
      customer_email: customerEmail || "client@dashify.app",
      customer_phone_number: customerPhone || "",
      customer_address: "Dakar", customer_city: "Dakar", customer_country: "SN",
      channels: "ALL", lang: "fr",
      metadata: JSON.stringify({ bookingId, userId: user.id }),
    }),
  });
  const payData = await payRes.json();
  if (!payData.data?.payment_url) {
    return NextResponse.json({ error: payData.message || "Erreur paiement", details: payData }, { status: 500 });
  }
  await supabase.from("bookings").update({ payment_transaction_id: transactionId }).eq("id", bookingId);
  return NextResponse.json({ ok: true, paymentUrl: payData.data.payment_url, transactionId });
}