/**
 * Labels Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Tag } from 'lucide-react';

export default async function LabelsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: labels } = user
    ? await supabase
        .from('custom_labels')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
    : { data: null };

  return (
    <div className="p-8">
      <PageHeader title="Labels" description="Organize your emails with custom labels" />

      {labels && labels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {labels.map((label: any) => (
            <Card key={label.id} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="font-medium">{label.name}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Tag className="h-12 w-12" />}
            title="No labels"
            description="Create custom labels to organize your emails"
          />
        </Card>
      )}
    </div>
  );
}
