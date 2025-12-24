// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get login info from JWT (Edge-safe)
  const token = await getToken({
    req,
    // if not specify secret, there might have problems. defaults to NEXTAUTH_SECRET / AUTH_SECRET environment variable
    secret: process.env.AUTH_SECRET
  });


  // Protected routes that require login
  const protectedRoutes = ['/orders', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Admin-only routes
  const isAdminRoute = pathname.startsWith('/admin');

  // Check if user is trying to access protected route
  if (isProtectedRoute || isAdminRoute) {
    // No token -> not logged in -> redirect to sign in
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Has token, check admin permission
    if (isAdminRoute && token.role !== 'admin') {
      // Not admin → redirect to home
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // All checks passed → allow access
  return NextResponse.next();
}

// Routes to apply middleware to
export const config = {
  matcher: [
    '/orders/:path*',
    '/profile/:path*', // haven't implemented -> future function
    '/settings/:path*', // haven't implemented -> future function
    '/admin/:path*',
    '/api/admin/:path*', // second protection
  ],
};
