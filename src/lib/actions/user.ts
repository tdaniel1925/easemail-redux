/**
 * Server actions for user management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireSuperAdmin } from '@/lib/auth/permissions';
import { emitEvent } from '@/lib/events';
import {
  updateUserProfileSchema,
  updateUserRoleSchema,
  updateUserPreferencesSchema,
  type UpdateUserProfileInput,
  type UpdateUserRoleInput,
  type UpdateUserPreferencesInput,
} from '@/lib/validations';
import type { User, UserPreferences } from '@/types/database';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// USER PROFILE
// =============================================================================

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<ActionResult<User>> {
  try {
    const perms = await requireAuth();
    const validated = updateUserProfileSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await (supabase
      .from('users') as any)
      .update(validated)
      .eq('id', perms.userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit event
    await emitEvent({
      eventType: 'user.profile_updated',
      entityType: 'user',
      entityId: perms.userId,
      actorId: perms.userId,
      payload: {
        name: (data as any).name,
        email: (data as any).email,
      },
      metadata: { source: 'ui' },
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update user profile' };
  }
}

export async function updateUserRole(input: UpdateUserRoleInput): Promise<ActionResult<User>> {
  try {
    await requireSuperAdmin();
    const validated = updateUserRoleSchema.parse(input);

    const supabase = await createClient();
    const { data, error } = await (supabase.from('users') as any).update({ role: validated.role }).eq('id', validated.id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update user role' };
  }
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

export async function getUserPreferences(): Promise<ActionResult<UserPreferences>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', perms.userId).maybeSingle();

    if (error) throw new Error(error.message);

    // Create default preferences if they don't exist
    if (!data) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: perms.userId,
        } as any)
        .select()
        .single();

      if (createError) throw new Error(createError.message);
      return { data: newPrefs, error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get user preferences' };
  }
}

export async function updateUserPreferences(input: UpdateUserPreferencesInput): Promise<ActionResult<UserPreferences>> {
  try {
    const perms = await requireAuth();
    const validated = updateUserPreferencesSchema.parse(input);

    const supabase = await createClient();

    // Upsert preferences
    const { data, error } = await (supabase
      .from('user_preferences') as any)
      .upsert({
        user_id: perms.userId,
        ...validated,
      })
      .eq('user_id', perms.userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update user preferences' };
  }
}
