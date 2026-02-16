import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Create the Supabase client ONCE here in middleware
  // Never create parallel clients in layouts/components - causes token refresh race condition
  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    // If refresh token is missing/invalid, clear the cookies
    if (error && error.message.includes('refresh_token_not_found')) {
      // Clear invalid auth cookies by setting them to empty
      const cookiesToClear = ['sb-access-token', 'sb-refresh-token'];
      cookiesToClear.forEach((name) => {
        supabaseResponse.cookies.delete(name);
      });
      user = null;
    } else if (error) {
      // Other auth errors - log but don't expose to user
      console.warn('[Middleware] Auth error (non-fatal):', error.message);
      user = null;
    } else {
      user = data.user;
    }
  } catch (error) {
    // Catch any unexpected errors during auth check
    console.error('[Middleware] Unexpected error during auth check:', error);
    user = null;
  }

  // Don't do heavy processing in middleware - keep it fast
  // Session extension happens in the auth action instead

  return { supabaseResponse, user };
}
