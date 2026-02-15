/**
 * Settings Page
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getProvider } from '@/lib/providers';
import crypto from 'crypto';

async function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  return { codeVerifier, codeChallenge, state };
}

async function ConnectMicrosoft() {
  'use server';

  const { codeVerifier, codeChallenge, state } = await generatePKCE();

  // Store in httpOnly cookies
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });
  cookieStore.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5,
    path: '/',
  });

  // Get auth URL
  const provider = getProvider('MICROSOFT');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/microsoft`;
  const authUrl = await provider.getAuthUrl(redirectUri, state, codeChallenge);

  redirect(authUrl);
}

async function ConnectGoogle() {
  'use server';

  const { codeVerifier, codeChallenge, state } = await generatePKCE();

  // Store in httpOnly cookies
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5,
    path: '/',
  });
  cookieStore.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5,
    path: '/',
  });

  // Get auth URL
  const provider = getProvider('GOOGLE');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/google`;
  const authUrl = await provider.getAuthUrl(redirectUri, state, codeChallenge);

  redirect(authUrl);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; email?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('users').select('*').eq('id', user.id).single()
    : { data: null };

  const { data: preferences } = user
    ? await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
    : { data: null };

  const { data: emailAccounts } = user
    ? await supabase.from('email_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="accounts">Email Accounts</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={(profile as any)?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {(profile as any)?.name?.[0]?.toUpperCase() || (profile as any)?.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{(profile as any)?.name || 'Unnamed'}</div>
                  <div className="text-sm text-muted-foreground">{(profile as any)?.email}</div>
                  <Badge className="mt-1" variant="secondary">
                    {(profile as any)?.role}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 mt-6">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={(profile as any)?.name || ''} />
                </div>
                <div className="grid gap-2">
                  <Label>Nickname</Label>
                  <Input defaultValue={(profile as any)?.nickname || ''} />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input defaultValue={(profile as any)?.email} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Timezone</Label>
                  <Input defaultValue={(profile as any)?.timezone} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Email Preferences</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Theme</Label>
                <div className="text-sm text-muted-foreground">
                  Current: {(preferences as any)?.theme || 'system'}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Inbox Layout</Label>
                <div className="text-sm text-muted-foreground">
                  Current: {(preferences as any)?.inbox_layout || 'split'}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Reading Pane Position</Label>
                <div className="text-sm text-muted-foreground">
                  Current: {(preferences as any)?.reading_pane_position || 'right'}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Email Accounts Tab */}
        <TabsContent value="accounts">
          <div className="space-y-6">
            {searchParams.success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                Successfully connected {searchParams.email}
              </div>
            )}

            {searchParams.error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                Error: {searchParams.error}
              </div>
            )}

            {(!emailAccounts || emailAccounts.length === 0) ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Connect Email Accounts</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect your Microsoft or Google email accounts to start syncing messages
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="p-6 border-2">
                    <h4 className="mb-2 text-lg font-semibold">Microsoft</h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Connect your Outlook or Microsoft 365 account
                    </p>
                    <form action={ConnectMicrosoft}>
                      <Button type="submit">Connect Microsoft Account</Button>
                    </form>
                  </Card>

                  <Card className="p-6 border-2">
                    <h4 className="mb-2 text-lg font-semibold">Google</h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Connect your Gmail or Google Workspace account
                    </p>
                    <form action={ConnectGoogle}>
                      <Button type="submit">Connect Google Account</Button>
                    </form>
                  </Card>
                </div>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Connected Email Accounts</h3>
                  <div className="space-y-4">
                    {emailAccounts.map((account: any) => (
                      <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {account.provider === 'MICROSOFT' ? 'M' : 'G'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{account.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {account.provider} • {account.sync_status}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.error_message && (
                            <p className="text-sm text-red-600 mr-2">{account.error_message}</p>
                          )}
                          {account.is_primary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Add Another Account</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <form action={ConnectMicrosoft}>
                      <Button type="submit" variant="outline" className="w-full">
                        <span className="mr-2">M</span> Add Microsoft Account
                      </Button>
                    </form>
                    <form action={ConnectGoogle}>
                      <Button type="submit" variant="outline" className="w-full">
                        <span className="mr-2">G</span> Add Google Account
                      </Button>
                    </form>
                  </div>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
