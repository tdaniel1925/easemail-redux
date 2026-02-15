// Session management utilities
// Phase 1, Task 7

import { createClient } from '@/lib/supabase/server';

/**
 * Extends the session expiry for the current user
 * Called on every request by middleware to keep sessions alive
 *
 * @param rememberMe - If true, sets long expiry (90 days), otherwise standard (7 days)
 * @returns void
 */
export async function extendSession(rememberMe: boolean = false): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      // No user logged in, nothing to extend
      return;
    }

    // Calculate new expiry time
    const now = new Date();
    let expiresAt: Date;

    if (rememberMe) {
      // 90 days for remember me
      expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else {
      // 7 days for standard sessions
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Update session expiry in users table
    await supabase
      .from('users')
      .update({ session_expires_at: expiresAt.toISOString() })
      .eq('id', user.id);

    // Refresh the Supabase auth session to keep it alive
    await supabase.auth.refreshSession();
  } catch (error) {
    // Silently fail - don't break the request if session extension fails
    console.error('Failed to extend session:', error);
  }
}

/**
 * Checks if the current session has expired based on user's session_expires_at
 * @returns true if expired, false otherwise
 */
export async function isSessionExpired(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return true; // No user = expired
    }

    // Get user's session expiry from database
    const { data: userData } = await supabase
      .from('users')
      .select('session_expires_at')
      .eq('id', user.id)
      .single();

    if (!userData?.session_expires_at) {
      // No expiry set = not expired (indefinite session)
      return false;
    }

    const expiryDate = new Date(userData.session_expires_at);
    const now = new Date();

    return now > expiryDate;
  } catch (error) {
    console.error('Failed to check session expiry:', error);
    return false; // On error, assume not expired (fail open)
  }
}
