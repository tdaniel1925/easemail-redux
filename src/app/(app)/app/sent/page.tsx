/**
 * Sent Messages Page
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Send } from 'lucide-react';

export default async function SentPage() {
  return (
    <div className="p-8">
      <PageHeader title="Sent" description="Messages you've sent" />

      <Card className="p-6">
        <EmptyState
          icon={<Send className="h-12 w-12" />}
          title="No sent messages"
          description="Messages will sync from your connected email accounts (Stage 4)"
        />
      </Card>
    </div>
  );
}
