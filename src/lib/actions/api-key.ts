/**
 * Server actions for API key management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import {
  createApiKeySchema,
  updateApiKeySchema,
  deleteApiKeySchema,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
  type DeleteApiKeyInput,
} from '@/lib/validations';
import type { ApiKey } from '@/types/database';
import * as crypto from 'crypto';

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

// =============================================================================
// API KEYS
// =============================================================================

/**
 * Generate a cryptographically secure API key
 */
function generateApiKey(): string {
  // Format: em_live_32randomchars or em_test_32randomchars
  const prefix = process.env.NODE_ENV === 'production' ? 'em_live_' : 'em_test_';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomBytes}`;
}

/**
 * Hash API key using bcrypt-compatible algorithm
 */
async function hashApiKey(key: string): Promise<string> {
  // Use bcrypt or similar in production
  // For now, using crypto hash (replace with bcrypt in production)
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(
  input: CreateApiKeyInput
): Promise<ActionResult<{ api_key: ApiKey; plaintext_key: string }>> {
  try {
    const perms = await requireAuth();
    const validated = createApiKeySchema.parse(input);

    const plaintextKey = generateApiKey();
    const keyHash = await hashApiKey(plaintextKey);
    const keyPrefix = plaintextKey.substring(0, 8);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: perms.userId,
        name: validated.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: validated.scopes,
        expires_at: validated.expires_at || null,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Return plaintext key only once - user must save it
    return {
      data: {
        api_key: data,
        plaintext_key: plaintextKey,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create API key' };
  }
}

export async function updateApiKey(input: UpdateApiKeyInput): Promise<ActionResult<ApiKey>> {
  try {
    const perms = await requireAuth();
    const validated = updateApiKeySchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: apiKey } = await supabase.from('api_keys').select('user_id').eq('id', validated.id).single();

    if (!apiKey || (apiKey as any).user_id !== perms.userId) {
      throw new Error('Forbidden - API key not found or access denied');
    }

    const { id, ...updates } = validated;
    const { data, error } = await (supabase.from('api_keys') as any).update(updates).eq('id', id).select().single();

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update API key' };
  }
}

export async function deleteApiKey(input: DeleteApiKeyInput): Promise<ActionResult<{ success: true }>> {
  try {
    const perms = await requireAuth();
    const validated = deleteApiKeySchema.parse(input);

    const supabase = await createClient();

    // Verify ownership
    const { data: apiKey } = await supabase.from('api_keys').select('user_id').eq('id', validated.id).single();

    if (!apiKey || (apiKey as any).user_id !== perms.userId) {
      throw new Error('Forbidden - API key not found or access denied');
    }

    const { error } = await supabase.from('api_keys').delete().eq('id', validated.id);

    if (error) throw new Error(error.message);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to delete API key' };
  }
}

export async function getApiKeys(): Promise<ActionResult<ApiKey[]>> {
  try {
    const perms = await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', perms.userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to get API keys' };
  }
}
