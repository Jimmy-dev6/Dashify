import { createClient } from "@supabase/supabase-js";

/**
 * Client admin (service role). Nécessaire pour supprimer un compte auth.
 * Définir SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
