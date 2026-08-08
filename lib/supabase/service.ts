import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-to-server paths that have no
// user session to read (e.g. /api/ingest-email, called by a scheduled
// Apps Script with no browser/cookie involved). This bypasses Row Level
// Security entirely, so every caller must set user_id explicitly on every
// query and must never expose this client or its results to a
// non-authenticated caller.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
