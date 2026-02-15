/**
 * Admin - Activity Dashboard Page
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Activity } from 'lucide-react';

export default async function AdminActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activity Dashboard"
        description="Monitor real-time system activity"
      />

      <Card className="p-6">
        <EmptyState
          icon={<Activity className="h-12 w-12" />}
          title="Activity dashboard coming soon"
          description="View real-time metrics, user activity, and system performance"
        />
      </Card>
    </div>
  );
}
