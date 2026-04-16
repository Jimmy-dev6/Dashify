import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Multipart requis." }, { status: 400 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") || "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const bucket =
    kind === "company_logo" ? "company-logos" : kind === "avatar" ? "avatars" : null;
  if (!bucket) {
    return NextResponse.json({ error: "kind invalide (avatar ou company_logo)." }, { status: 400 });
  }

  const mime = file.type || "";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Image uniquement." }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 3 Mo)." }, { status: 400 });
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : "jpg";

  const path = `${user.id}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType: mime,
    upsert: true,
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const col = kind === "company_logo" ? "company_logo" : "avatar_url";
  const { error: pErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, [col]: publicUrl } as never, { onConflict: "id" });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, publicUrl, field: col });
}
