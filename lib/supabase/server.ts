/**
 * Server-side Supabase auth client (anon/publishable key + request cookies).
 *
 * This client reads/writes the auth session cookies in route handlers and
 * server components. It is for AUTH ONLY (sign-in callback, sign-out, reading
 * the current user) — application data is served by the service-role
 * repository in lib/db/supabase.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll can be called from a Server Component where mutation is
            // not allowed; the middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
