'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAuthEvent, logUserCreation } from './audit';
import { trackLogin } from './login-tracking';
import { emitEvent } from '@/lib/events';

interface AuthResult {
  error?: string;
  success?: boolean;
}

export async function signIn(email: string, password: string, rememberMe?: boolean): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Track failed login
    if ((data as any)?.user?.id) {
      await trackLogin((data as any).user.id, false, undefined, undefined, error.message);
    }

    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to sign in' };
  }

  // Update user's remember_me preference and set session expiry
  if (rememberMe !== undefined) {
    const now = new Date();
    const expiresAt = rememberMe
      ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await supabase
      .from('users')
      .update({
        remember_me: rememberMe,
        session_expires_at: expiresAt.toISOString(),
      })
      .eq('id', data.user.id);
  }

  // Track successful login
  await trackLogin((data as any).user.id, true);

  // Log auth event
  await logAuthEvent(data.user.id, 'login');

  // Emit event
  await emitEvent({
    eventType: 'user.login',
    entityType: 'user',
    entityId: data.user.id,
    actorId: data.user.id,
    payload: {
      email: data.user.email,
    },
    metadata: { source: 'ui' },
  });

  return { success: true };
}

export async function signInWithMagicLink(email: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signUp(data: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResult> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        name: data.name,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Failed to create account' };
  }

  // Create user profile (this happens via database trigger in production)
  // The trigger creates the user record automatically when auth.users is inserted
  // We just need to update it with the name
  const updateData: Record<string, any> = {
    name: data.name,
    role: 'INDIVIDUAL',
  };
  await (supabase.from('users') as any).update(updateData).eq('id', authData.user.id);

  // Log user creation
  await logUserCreation(authData.user.id, authData.user.id);

  // Emit event
  await emitEvent({
    eventType: 'user.created',
    entityType: 'user',
    entityId: authData.user.id,
    actorId: authData.user.id,
    payload: {
      email: data.email,
      name: data.name,
      role: 'INDIVIDUAL',
    },
    metadata: { source: 'ui' },
  });

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await logAuthEvent(user.id, 'logout');

    // Emit event
    await emitEvent({
      eventType: 'user.logout',
      entityType: 'user',
      entityId: user.id,
      actorId: user.id,
      payload: {
        email: user.email,
      },
      metadata: { source: 'ui' },
    });
  }

  await supabase.auth.signOut();

  redirect('/auth/signin');
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
