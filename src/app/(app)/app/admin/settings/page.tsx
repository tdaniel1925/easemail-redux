/**
 * Admin - System Settings Page
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Settings } from 'lucide-react';

export default async function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Configure global system settings"
      />

      <Card className="p-6">
        <EmptyState
          icon={<Settings className="h-12 w-12" />}
          title="System settings coming soon"
          description="Configure feature flags, rate limits, and other system-wide settings"
        />
      </Card>
    </div>
  );
}
