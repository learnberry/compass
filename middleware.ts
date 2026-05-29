import { NextResponse, type NextRequest } from "next/server";

import { isAllowedEmail } from "@/lib/auth/allowed";
import { updateSession } from "@/lib/supabase/middleware";

/** Paths reachable without a session (the login flow itself). */
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return response;

  const authorized = user != null && isAllowedEmail(user.email);
  if (authorized) return response;

  // Unauthorized: API calls get a 401, page navigations get the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static / PWA assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icon.svg|icons/).*)",
  ],
};
