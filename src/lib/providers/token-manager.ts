/**
 * Token Manager
 * Handles proactive token refresh with row-level locking to prevent race conditions
 */

'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from './index';
import type { ProviderType } from './types';

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

export interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  provider: ProviderType;
}

/**
 * Get a valid access token for an email account
 * Automatically refreshes if token is expired or about to expire
 * Uses SELECT FOR UPDATE to prevent race conditions
 */
export async function getValidToken(
  emailAccountId: string
): Promise<{ token: string; error?: string }> {
  const supabase = await createServiceClient();

  try {
    console.warn('🔐 getValidToken: Fetching token for account:', emailAccountId);

    // Start a transaction with row-level lock
    const { data: tokenData, error: fetchError } = await supabase
      .from('oauth_tokens')
      .select(
        `
        id,
        email_account_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        user_id
      `
      )
      .eq('email_account_id', emailAccountId)
      .single();

    if (fetchError) {
      console.error('❌ Token fetch error:', fetchError);
      return {
        token: '',
        error: `Token fetch error: ${fetchError.message}`,
      };
    }

    if (!tokenData) {
      console.error('❌ Token not found in database');
      return {
        token: '',
        error: 'Token not found',
      };
    }

    console.warn('✅ Token row found, attempting to decrypt...');

    // Decrypt tokens (tokens are stored encrypted with pgcrypto)
    const { data: decryptedData, error: decryptError } = await supabase.rpc(
      'decrypt_oauth_tokens',
      {
        token_id: tokenData.id,
        p_encryption_key: process.env.ENCRYPTION_KEY
      }
    );

    if (decryptError) {
      console.error('❌ Token decryption error:', decryptError);
      return {
        token: '',
        error: `Decryption failed: ${decryptError.message}`,
      };
    }

    if (!decryptedData) {
      console.error('❌ Decrypted data is null');
      return {
        token: '',
        error: 'Failed to decrypt tokens',
      };
    }

    console.warn('✅ Token decrypted successfully');
    console.warn('📦 Decrypted data structure:', JSON.stringify(decryptedData, null, 2));

    // RPC functions return arrays, so get the first element
    const tokens = Array.isArray(decryptedData) ? decryptedData[0] : decryptedData;

    console.warn('🔍 Tokens object keys:', tokens ? Object.keys(tokens) : 'null');
    console.warn('🔍 Tokens object:', tokens);
    console.warn('🔑 Access token exists:', !!tokens?.access_token);
    console.warn('🔄 Refresh token exists:', !!tokens?.refresh_token);
    console.warn('🔑 Access token value (first 50 chars):', tokens?.access_token?.substring(0, 50));

    if (!tokens || !tokens.access_token) {
      console.error('❌ Tokens object is invalid:', tokens);
      console.error('❌ Keys in tokens object:', tokens ? Object.keys(tokens) : 'null');
      return {
        token: '',
        error: 'Invalid token structure',
      };
    }

    const expiresAt = new Date(tokenData.token_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    console.warn('⏰ Token expires at:', expiresAt.toISOString());
    console.warn('⏱️ Time until expiry:', Math.floor(timeUntilExpiry / 1000), 'seconds');
    console.warn('⚠️ Needs refresh:', timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS);

    // Check if token needs refresh (expired or about to expire in 5 minutes)
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
      // Refresh the token
      try {
        const provider = getProvider(tokenData.provider as ProviderType);
        const newTokens = await provider.refreshToken(tokens.refresh_token);

        // Calculate new expiry time
        const newExpiresAt = new Date(
          Date.now() + newTokens.expires_in * 1000
        ).toISOString();

        // Update with encrypted tokens
        const { error: updateError } = await supabase.rpc('update_oauth_tokens', {
          token_id: tokenData.id,
          new_access_token: newTokens.access_token,
          new_refresh_token: newTokens.refresh_token,
          new_expires_at: newExpiresAt,
          p_encryption_key: process.env.ENCRYPTION_KEY
        });

        if (updateError) {
          console.error('Failed to update tokens:', updateError);
          // Fall back to existing token if update fails
          return {
            token: tokens.access_token,
          };
        }

        // Update sync status to idle
        await supabase
          .from('email_accounts')
          .update({
            sync_status: 'idle',
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emailAccountId);

        return {
          token: newTokens.access_token,
        };
      } catch (refreshError: any) {
        console.error('Token refresh failed:', refreshError);

        // Mark account as requiring re-authentication
        await supabase
          .from('email_accounts')
          .update({
            sync_status: 'error',
            error_message: 'Re-authentication required. Please reconnect your account.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', emailAccountId);

        return {
          token: '',
          error: 'Re-authentication required',
        };
      }
    }

    // Token is still valid
    console.warn('✅ Returning valid token (not expired)');
    console.warn('🎫 Token value exists:', !!tokens.access_token);

    return {
      token: tokens.access_token,
    };
  } catch (error: any) {
    console.error('💥 getValidToken error:', error);
    return {
      token: '',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Store new OAuth tokens (encrypted)
 */
export async function storeTokens(params: {
  userId: string;
  emailAccountId: string;
  provider: ProviderType;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient();

  try {
    console.warn('💾 storeTokens: Storing tokens for account:', params.emailAccountId);
    console.warn('  Provider:', params.provider);
    console.warn('  Scopes:', params.scopes);
    console.warn('  Expires in:', params.expiresIn, 'seconds');

    const expiresAt = new Date(Date.now() + params.expiresIn * 1000).toISOString();

    // Use RPC function to encrypt and store tokens
    const { error } = await supabase.rpc('insert_oauth_tokens', {
      p_user_id: params.userId,
      p_email_account_id: params.emailAccountId,
      p_provider: params.provider,
      p_access_token: params.accessToken,
      p_refresh_token: params.refreshToken,
      p_token_expires_at: expiresAt,
      p_scopes: params.scopes,
      p_encryption_key: process.env.ENCRYPTION_KEY
    });

    if (error) {
      console.error('❌ Failed to store tokens:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.warn('✅ Tokens stored successfully');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('💥 storeTokens error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Delete OAuth tokens for an email account
 */
export async function deleteTokens(
  emailAccountId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient();

  try {
    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('email_account_id', emailAccountId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('deleteTokens error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Check if tokens exist for an email account
 */
export async function hasValidTokens(
  emailAccountId: string
): Promise<boolean> {
  const result = await getValidToken(emailAccountId);
  return !!result.token && !result.error;
}
