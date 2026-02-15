import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Users, Mail, Inbox, Archive, Trash2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Dashboard - EaseMail',
  description: 'Admin dashboard',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch total users count
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Fetch total active email accounts
  const { count: totalAccounts } = await supabase
    .from('email_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Fetch total messages count
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  // Fetch inbox messages count
  const { count: inboxCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('folder_type', 'inbox')
    .is('archived_at', null);

  // Fetch archived messages count
  const { count: archivedCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('folder_type', 'archive');

  // Fetch trashed messages count
  const { count: trashedCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('folder_type', 'trash');

  // Fetch sync errors count (accounts with error_message set)
  const { count: syncErrors } = await supabase
    .from('email_accounts')
    .select('*', { count: 'exact', head: true })
    .not('error_message', 'is', null);

  // Calculate average accounts per user
  const avgAccountsPerUser = totalUsers && totalUsers > 0
    ? (totalAccounts || 0) / totalUsers
    : 0;

  const metrics = [
    {
      title: 'Total Users',
      value: totalUsers || 0,
      icon: Users,
      description: 'Registered users',
      color: 'text-blue-600',
    },
    {
      title: 'Email Accounts',
      value: totalAccounts || 0,
      icon: Mail,
      description: 'Active email accounts',
      color: 'text-green-600',
    },
    {
      title: 'Avg Accounts/User',
      value: avgAccountsPerUser.toFixed(1),
      icon: Mail,
      description: 'Average per user',
      color: 'text-purple-600',
    },
    {
      title: 'Total Messages',
      value: totalMessages || 0,
      icon: Inbox,
      description: 'All messages in system',
      color: 'text-indigo-600',
    },
    {
      title: 'Inbox Messages',
      value: inboxCount || 0,
      icon: Inbox,
      description: 'Currently in inbox',
      color: 'text-cyan-600',
    },
    {
      title: 'Archived',
      value: archivedCount || 0,
      icon: Archive,
      description: 'Archived messages',
      color: 'text-gray-600',
    },
    {
      title: 'Trashed',
      value: trashedCount || 0,
      icon: Trash2,
      description: 'Messages in trash',
      color: 'text-orange-600',
    },
    {
      title: 'Sync Errors (24h)',
      value: syncErrors || 0,
      icon: AlertCircle,
      description: 'Recent sync errors',
      color: syncErrors && syncErrors > 0 ? 'text-red-600' : 'text-gray-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="System-wide metrics and statistics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold mt-2">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {syncErrors && syncErrors > 0 && (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Sync Errors Detected
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {syncErrors} sync error{syncErrors !== 1 ? 's' : ''} occurred in the last 24 hours.
                Check the sync logs for details.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
