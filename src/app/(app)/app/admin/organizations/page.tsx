/**
 * Admin - Organizations Management Page
 */

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();

  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage all organizations in the system"
      />

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing Email</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations?.map((org: any) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-muted-foreground">/{org.slug}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      org.plan === 'ENTERPRISE'
                        ? 'default'
                        : org.plan === 'BUSINESS'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {org.plan}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {org.seats_used} / {org.seats}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      org.subscription_status === 'active'
                        ? 'default'
                        : org.subscription_status === 'trialing'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {org.subscription_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{org.billing_email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(org.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
