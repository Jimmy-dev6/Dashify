import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) {
    return NextResponse.json({ error: "Non connecté ou email indisponible." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const redirectTo = `${origin}/auth/callback?next=/dashboard/settings`;

  const anonClient = createClient(url, anon);
  const { error } = await anonClient.auth.resetPasswordForEmail(user.email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Un email de réinitialisation a été envoyé.",
  });
}
