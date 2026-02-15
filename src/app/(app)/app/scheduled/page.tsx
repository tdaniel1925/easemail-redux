/**
 * Scheduled Emails Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Clock } from 'lucide-react';

export default async function ScheduledEmailsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: scheduledEmails } = user
    ? await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Scheduled Emails" description="Emails scheduled to send later" />

      {scheduledEmails && scheduledEmails.length > 0 ? (
        <div className="space-y-3">
          {scheduledEmails.map((email: any) => (
            <Card key={email.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-medium truncate">{email.subject || '(No subject)'}</div>
                    <Badge
                      variant={
                        email.status === 'queued'
                          ? 'default'
                          : email.status === 'sent'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {email.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    To:{' '}
                    {Array.isArray(email.to_recipients) && email.to_recipients.length > 0
                      ? email.to_recipients.map((r: any) => r.email).join(', ')
                      : '(No recipients)'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Scheduled for: {new Date(email.scheduled_for).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="No scheduled emails"
            description="Schedule emails to send at a specific time"
          />
        </Card>
      )}
    </div>
  );
}
