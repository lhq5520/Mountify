// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe auth gate using `getToken()`.
 *
 * Why:
 * - Next.js Middleware runs on the Edge runtime by default.
 * - Edge runtime does NOT support Node's `crypto`.
 * - Your current Auth.js `auth()` wrapper triggers Node crypto -> crash.
 *
 * This middleware:
 * - Reads JWT from the session cookie via `getToken()`
 * - Redirects unauthenticated users away from protected routes
 * - Enforces admin-only routes via `token.role`
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // IMPORTANT:
  // In Auth.js v5, the session cookie name is often "authjs.session-token"
  // and in production (HTTPS) it may be prefixed with "__Secure-".
  // We try both common names to be robust.
  const token =
    (await getToken({
      req,
      cookieName: "__Secure-authjs.session-token",
    })) ||
    (await getToken({
      req,
      cookieName: "authjs.session-token",
    })) ||
    // fallback for older next-auth cookie names (optional safety)
    (await getToken({
      req,
      cookieName: "__Secure-next-auth.session-token",
    })) ||
    (await getToken({
      req,
      cookieName: "next-auth.session-token",
    }));

  const protectedRoutes = ["/orders", "/profile", "/settings"];
  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r));

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isProtectedRoute || isAdminRoute) {
    if (!token) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }

    if (isAdminRoute && (token as any).role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/orders/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
