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

  // Timeout helper
  const fetchWithTimeout = (url: string, options: RequestInit, ms = 8000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeout));
  };

  // Étape 1 : Auth
  let token: string;
  try {
    const authRes = await fetchWithTimeout("https://client.cinetpay.com/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY,
        password: process.env.CINETPAY_API_PASSWORD,
      }),
    });
    const authData = await authRes.json();
    console.log("[CinetPay auth]", JSON.stringify(authData).slice(0, 200));
    if (!authData.data?.token) {
      return NextResponse.json({ error: "Auth échouée", details: authData }, { status: 500 });
    }
    token = authData.data.token;
  } catch (e: any) {
    return NextResponse.json({ error: "Auth timeout/erreur", message: e.message }, { status: 500 });
  }

  // Étape 2 : Init paiement
  const nameParts = (customerName || "Client Dashify").split(" ");
  try {
    const payRes = await fetchWithTimeout("https://api.cinetpay.net/v1/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        merchant_transaction_id: transactionId,
        amount: Math.round(amount),
        currency: "XOF",