import { NextResponse } from "next/server";
import { auth } from "@/auth"; 

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const token = req.auth;  // directly get session

  // Protected routes that require login
  const protectedRoutes = ['/orders', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Admin-only routes
  const isAdminRoute = pathname.startsWith('/admin');

  if (isProtectedRoute || isAdminRoute) {
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isAdminRoute && token.user?.role !== 'admin') {
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/orders/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};