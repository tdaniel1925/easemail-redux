/**
 * Microsoft OAuth Callback
 * Handles OAuth2 PKCE flow callback from Microsoft
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { storeTokens } from '@/lib/providers/token-manager';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/app/settings?error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/app/settings?error=missing_parameters', request.url)
    );
  }

  try {
    const cookieStore = await cookies();

    // Verify state
    const storedState = cookieStore.get('oauth_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        new URL('/app/settings?error=state_mismatch', request.url)
      );
    }

    // Get PKCE code verifier
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/app/settings?error=missing_verifier', request.url)
      );
    }

    // Exchange code for tokens
    const provider = getProvider('MICROSOFT');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/microsoft`;

    const tokens = await provider.exchangeCode(code, redirectUri, codeVerifier);

    // Get user info to extract email
    const userInfoResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;

    if (!email) {
      throw new Error('No email address found in user profile');
    }

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=not_authenticated', request.url)
      );
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single();

    let emailAccountId: string;

    if (existingAccount) {
      // Update existing account
      emailAccountId = existingAccount.id;
      await supabase
        .from('email_accounts')
        .update({
          sync_status: 'idle',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailAccountId);
    } else {
      // Create new email account
      const { data: newAccount, error: createError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          provider: 'MICROSOFT',
          email,
          name: userInfo.displayName || null,
          is_primary: false,
          sync_status: 'idle',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newAccount) {
        throw new Error('Failed to create email account');
      }

      emailAccountId = newAccount.id;

      // Set as primary if it's the first account
      const { data: accountCount } = await supabase
        .from('email_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((accountCount?.length ?? 0) === 1) {
        await supabase
          .from('email_accounts')
          .update({ is_primary: true })
          .eq('id', emailAccountId);
      }
    }

    // Store encrypted tokens
    const scopes = tokens.scope?.split(' ') || [];
    const storeResult = await storeTokens({
      userId: user.id,
      emailAccountId,
      provider: 'MICROSOFT',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scopes,
    });

    if (!storeResult.success) {
      throw new Error('Failed to store tokens');
    }

    // Create sync checkpoints
    const syncTypes = ['messages', 'folders', 'calendar', 'contacts'];
    for (const syncType of syncTypes) {
      await supabase
        .from('sync_checkpoints')
        .upsert({
          email_account_id: emailAccountId,
          sync_type: syncType,
          cursor: null,
          last_successful_at: null,
          error_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // Clear OAuth cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_code_verifier');

    // Trigger initial sync by setting status to 'syncing'
    await supabase
      .from('email_accounts')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId);

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/app/settings?success=true&email=${encodeURIComponent(email)}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/app/settings?error=${encodeURIComponent(error.message || 'unknown_error')}`,
        request.url
      )
    );
  }
}
