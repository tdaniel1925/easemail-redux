import { getActivityFeed } from '@/lib/events';
import { ActivityFeed } from '@/components/events/activity-feed';
import { PageHeader } from '@/components/layout/page-header';

export default async function ActivityPage() {
  const events = await getActivityFeed(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Feed"
        description="View recent activity across your account"
      />

      <ActivityFeed events={events} limit={100} />
    </div>
  );
}
