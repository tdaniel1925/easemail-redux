/**
 * Drafts Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { FileText } from 'lucide-react';

export default async function DraftsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: drafts } = user
    ? await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Drafts" description="Your saved email drafts" />

      {drafts && drafts.length > 0 ? (
        <div className="space-y-3">
          {drafts.map((draft: any) => (
            <Card key={draft.id} className="p-4 hover:bg-accent/5 cursor-pointer transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{draft.subject || '(No subject)'}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    To:{' '}
                    {Array.isArray(draft.to_recipients) && draft.to_recipients.length > 0
                      ? draft.to_recipients.map((r: any) => r.email).join(', ')
                      : '(No recipients)'}
                  </div>
                  {draft.body_text && (
                    <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {draft.body_text.substring(0, 200)}...
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground ml-4">
                  {new Date(draft.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No drafts"
            description="Your draft emails will appear here"
          />
        </Card>
      )}
    </div>
  );
}
