/**
 * Admin - Audit Logs Page
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

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, users(email, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title="Audit Logs" description="View all system activity and changes" />

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell>
                  {(log.users as any)?.email || 'System'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{log.entity_type}</div>
                    {log.entity_id && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {log.entity_id.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.ip_address || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
