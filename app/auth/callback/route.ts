/**
 * OAuth callback — exchanges the PKCE `code` for a session, then enforces the
 * email allowlist. Disallowed accounts are signed straight back out.
 */

import { NextResponse, type NextRequest } from "next/server";

import { isAllowedEmail } from "@/lib/auth/allowed";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const denied = NextResponse.redirect(`${origin}/login?error=unauthorized`);

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !isAllowedEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return denied;
  }

  return NextResponse.redirect(`${origin}${next}`);
}
