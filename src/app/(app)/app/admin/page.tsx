import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - EaseMail',
  description: 'Admin dashboard',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      <p className="text-muted-foreground">
        Admin functionality will be built in later stages.
      </p>
    </div>
  );
}
