/**
 * Email Templates Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Bookmark } from 'lucide-react';

export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates } = user
    ? await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Email Templates" description="Reusable email templates" />

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: any) => (
            <Card key={template.id} className="p-4 hover:bg-accent/5 cursor-pointer transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{template.name}</div>
                  {template.category && (
                    <Badge variant="outline" className="mt-2">
                      {template.category}
                    </Badge>
                  )}
                </div>
              </div>
              {template.subject && (
                <div className="text-sm text-muted-foreground mb-2">Subject: {template.subject}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Used {template.use_count} {template.use_count === 1 ? 'time' : 'times'}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Bookmark className="h-12 w-12" />}
            title="No templates"
            description="Create reusable email templates to save time"
          />
        </Card>
      )}
    </div>
  );
}
