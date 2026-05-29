/**
 * Supabase client — the single place a service-role connection is created.
 *
 * This client uses the SERVICE ROLE key and therefore bypasses Row Level
 * Security. It must only ever run server-side (route handlers, server
 * components, scripts) — never ship it to the browser. Every consumer reaches
 * it through the repository in lib/db/repository.ts, which is server-only.
 *
 * The client is cached on `globalThis` so Next.js dev-server HMR, which
 * re-evaluates modules on every edit, does not construct a new client each time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __compassSupabase?: SupabaseClient;
};

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the Supabase repository.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabase: SupabaseClient =
  globalForSupabase.__compassSupabase ?? createSupabaseClient();

if (!globalForSupabase.__compassSupabase) {
  globalForSupabase.__compassSupabase = supabase;
}
