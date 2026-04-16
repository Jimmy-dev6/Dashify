import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { cpm_trans_id, cpm_custom } = body;

  const checkRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: cpm_trans_id,
    }),
  });

  const checkData = await checkRes.json();

  if (checkData.code !== "00" || checkData.data?.status !== "ACCEPTED") {
    return NextResponse.json({ ok: false });
  }

  const metadata = JSON.parse(cpm_custom || "{}");
  const { bookingId } = metadata;

  if (bookingId) {
    await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId);
  }

  return NextResponse.json({ ok: true });
}