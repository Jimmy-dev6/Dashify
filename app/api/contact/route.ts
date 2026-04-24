import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// ============================================
// CONSTANTS
// ============================================
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_NAME_LENGTH = 100;
const MIN_NAME_LENGTH = 2;
const MAX_EMAIL_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 3000;
const MIN_MESSAGE_LENGTH = 10;

// Rate limiting simple en mémoire (OK pour démarrer, on verra si ça explose)
// En prod Vercel serverless, chaque lambda a son propre compteur, donc c'est best-effort.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 tickets / h / IP

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

// ============================================
// HELPERS
// ============================================
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function hashIp(ip: string): string {
  // On ne stocke PAS l'IP brute pour raisons RGPD/privacy
  // Hash SHA-256 avec un salt minimal — suffisant pour dédup/rate limit
  const salt = process.env.CONTACT_IP_HASH_SALT ?? "dashify-contact-2026";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

function checkRateLimit(ipHash: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ipHash);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ipHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

function detectSpam(name: string, email: string, message: string): boolean {
  // Heuristiques très basiques, on raffinera si on voit arriver du spam
  const combined = `${name} ${email} ${message}`.toLowerCase();

  // Trop de liens http = probable spam
  const urlCount = (combined.match(/https?:\/\//g) ?? []).length;
  if (urlCount > 3) return true;

  // Keywords spam évidents
  const spamKeywords = [
    "viagra",
    "casino",
    "bitcoin investment",
    "crypto investment",
    "seo services",
    "backlinks",
  ];
  if (spamKeywords.some((kw) => combined.includes(kw))) return true;

  return false;
}

// ============================================
// POST /api/contact
// ============================================
type PostBody = {
  name?: string;
  email?: string;
  message?: string;
};

export async function POST(req: Request) {
  // Parse body
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  // Extract + trim
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const message = String(body.message ?? "").trim();

  // Field-level validation
  const fieldErrors: Record<string, string> = {};

  if (name.length < MIN_NAME_LENGTH) {
    fieldErrors.name = `Ton nom doit faire au moins ${MIN_NAME_LENGTH} caractères.`;
  } else if (name.length > MAX_NAME_LENGTH) {
    fieldErrors.name = `Ton nom est trop long (max ${MAX_NAME_LENGTH} caractères).`;
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Email invalide.";
  } else if (email.length > MAX_EMAIL_LENGTH) {
    fieldErrors.email = "Email trop long.";
  }

  if (message.length < MIN_MESSAGE_LENGTH) {
    fieldErrors.message = `Ton message doit faire au moins ${MIN_MESSAGE_LENGTH} caractères.`;
  } else if (message.length > MAX_MESSAGE_LENGTH) {
    fieldErrors.message = `Ton message est trop long (max ${MAX_MESSAGE_LENGTH} caractères).`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Certains champs ne sont pas valides.", fieldErrors },
      { status: 400 },
    );
  }

  // Rate limiting
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const rl = checkRateLimit(ipHash);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de messages envoyés. Réessaie dans une heure." },
      { status: 429 },
    );
  }

  // Spam detection
  const isSpam = detectSpam(name, email, message);

  // User agent
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Insert in Supabase via service_role (bypass RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[contact] Missing Supabase credentials");
    return NextResponse.json(
      { error: "Configuration serveur incomplète." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: insertErr } = await supabase.from("contact_tickets").insert({
    name,
    email,
    message,
    status: isSpam ? "spam" : "new",
    user_agent: userAgent,
    source: "contact_page",
    ip_hash: ipHash,
  });

  if (insertErr) {
    console.error("[contact] Insert error:", insertErr.message);
    return NextResponse.json(
      { error: "Impossible d'enregistrer ton message. Réessaie dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}