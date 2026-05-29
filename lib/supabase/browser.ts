/**
 * Browser-side Supabase client (anon/publishable key).
 *
 * Used only by the login page for the Google OAuth handshake — never for data
 * access. All data goes through the server-side service-role repository.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
