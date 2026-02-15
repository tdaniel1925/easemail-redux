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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extend session if user is logged in
  // Phase 1, Task 15: Session extension on every request
  if (user) {
    try {
      // Get user's remember_me preference from database
      const { data: userData } = await (supabase
        .from('users')
        .select('remember_me')
        .eq('id', user.id)
        .single() as any);

      const rememberMe = userData?.remember_me ?? false;

      // Calculate new expiry time
      const now = new Date();
      const expiresAt = rememberMe
        ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update session expiry
      const updateData: Record<string, any> = {
        session_expires_at: expiresAt.toISOString(),
      };
      await (supabase.from('users') as any).update(updateData).eq('id', user.id);

      // Refresh the Supabase auth session to keep it alive
      await supabase.auth.refreshSession();
    } catch (error) {
      // Silently fail - don't break the request if session extension fails
      console.error('Failed to extend session in middleware:', error);
    }
  }

  return { supabaseResponse, user };
}
