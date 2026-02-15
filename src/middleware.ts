import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/reset-password', '/auth/callback'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // API health check is always public
  if (request.nextUrl.pathname === '/api/health') {
    return supabaseResponse;
  }

  // Redirect to signin if not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to app if authenticated and trying to access auth pages
  if (user && isPublicRoute && request.nextUrl.pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/app/inbox', request.url));
  }

  // Check super admin access for admin routes
  if (user && request.nextUrl.pathname.startsWith('/app/admin')) {
    // Note: We need to check is_super_admin from the database
    // This is a basic check - full validation happens in the layout
    // We'll let it through here and the layout will do the final check
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
