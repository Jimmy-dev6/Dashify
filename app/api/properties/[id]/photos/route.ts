import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PostBody = {
  url?: string;
  role?: "cover" | "gallery";
  action?: "upload" | "set_as_cover";
};

type DeleteBody = {
  url?: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  const role = body.role === "cover" ? "cover" : "gallery";
  const action = body.action === "set_as_cover" ? "set_as_cover" : "upload";

  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: property, error: fetchErr } = await supabase
    .from("properties")
    .select("id, cover_image_url, photos")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !property) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const currentPhotos = Array.isArray(property.photos)
    ? (property.photos as string[])
    : [];
  const currentCover = property.cover_image_url ?? null;

  // === ACTION: SET_AS_COVER (swap atomique) ===
  if (action === "set_as_cover") {
    // L'URL doit exister quelque part (en galerie)
    if (!currentPhotos.includes(url)) {
      return NextResponse.json(
        { error: "Cette photo n'est pas dans la galerie." },
        { status: 400 },
      );
    }

    // Swap: la photo cliquée devient cover, l'ancienne cover (si elle existe
    // et n'est pas déjà la même) bascule en galerie à la place de celle promue.
    const nextPhotos = currentPhotos.filter((u) => u !== url);
    if (currentCover && currentCover !== url) {
      nextPhotos.push(currentCover);
    }

    const { error: updateErr } = await supabase
      .from("properties")
      .update({ cover_image_url: url, photos: nextPhotos })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "set_as_cover",
      cover_image_url: url,
      photos: nextPhotos,
    });
  }

  // === ACTION: UPLOAD (ajout d'une nouvelle photo) ===
  if (role === "cover") {
    // Upload d'une cover : si une cover existait, on la garde en galerie
    const nextPhotos = [...currentPhotos];
    if (currentCover && currentCover !== url && !nextPhotos.includes(currentCover)) {
      if (nextPhotos.length < 10) {
        nextPhotos.push(currentCover);
      }
      // Si galerie pleine, l'ancienne cover sera perdue (cas rare, 10 déjà)
    }

    const { error: updateErr } = await supabase
      .from("properties")
      .update({ cover_image_url: url, photos: nextPhotos })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "upload",
      role,
      cover_image_url: url,
      photos: nextPhotos,
    });
  } else {
    if (currentPhotos.length >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 photos dans la galerie." },
        { status: 400 },
      );
    }
    const nextPhotos = [...currentPhotos, url];
    const { error: updateErr } = await supabase
      .from("properties")
      .update({ photos: nextPhotos })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "upload",
      role,
      cover_image_url: currentCover,
      photos: nextPhotos,
    });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "URL manquante." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: property, error: fetchErr } = await supabase
    .from("properties")
    .select("id, cover_image_url, photos")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !property) {
    return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (property.cover_image_url === url) {
    patch.cover_image_url = null;
  }

  const currentPhotos = Array.isArray(property.photos)
    ? (property.photos as string[])
    : [];
  if (currentPhotos.includes(url)) {
    patch.photos = currentPhotos.filter((u: string) => u !== url);
  }

  // Edge case : l'URL n'existe nulle part, on throw pas mais on répond ok
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, note: "URL introuvable, rien à faire." });
  }

  const { error: updateErr } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}