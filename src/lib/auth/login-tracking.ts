import { createClient } from '@/lib/supabase/server';

export async function trackLogin(
  userId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Insert login tracking record
    await supabase
      .from('user_login_tracking')
      .insert({
        user_id: userId,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        success,
        failure_reason: failureReason || null,
      } as any);

    // Update user record on successful login
    if (success) {
      // Fetch current login count and increment
      const { data: user } = await supabase
        .from('users')
        .select('login_count')
        .eq('id', userId)
        .single();

      const updateData: Record<string, any> = {
        last_login_at: new Date().toISOString(),
        login_count: ((user as any)?.login_count || 0) + 1,
      };
      await (supabase.from('users') as any).update(updateData).eq('id', userId);
    }
  } catch (error) {
    console.error('Failed to track login:', error);
  }
}

export async function getRecentLogins(userId: string, limit: number = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_login_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('login_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch recent logins:', error);
    return [];
  }

  return data;
}

export async function getFailedLoginAttempts(userId: string, since: Date) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_login_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('success', false)
    .gte('login_at', since.toISOString())
    .order('login_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch failed login attempts:', error);
    return [];
  }

  return data;
}
