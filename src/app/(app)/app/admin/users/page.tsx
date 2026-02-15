/**
 * Admin - Users Management Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Fetch users with organization members
  const { data: users } = await supabase
    .from('users')
    .select('*, organization_members(organization_id, role, is_admin)')
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch email account counts per user
  const { data: accountCounts } = await supabase
    .from('email_accounts')
    .select('user_id')
    .eq('is_active', true);

  // Count accounts per user
  const accountCountMap = new Map<string, number>();
  accountCounts?.forEach((account) => {
    const count = accountCountMap.get(account.user_id) || 0;
    accountCountMap.set(account.user_id, count + 1);
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage all users in the system"
      />

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email Accounts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => {
              const accountCount = accountCountMap.get(user.id) || 0;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name || 'Unnamed'}</div>
                        {user.nickname && (
                          <div className="text-xs text-muted-foreground">
                            @{user.nickname}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_super_admin ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={accountCount > 0 ? 'default' : 'outline'}>
                      {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.onboarding_completed ? 'default' : 'outline'}>
                      {user.onboarding_completed ? 'Active' : 'Onboarding'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
