'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { clearTestData } from '@/lib/actions/clear-test-data';
import { toast } from 'sonner';

export function ClearTestDataSection() {
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);

  const handleClearData = async () => {
    if (confirmText !== 'DELETE TEST DATA') {
      toast.error('Please type "DELETE TEST DATA" to confirm');
      return;
    }

    setIsClearing(true);

    try {
      const result = await clearTestData();

      if (result.success) {
        toast.success(result.message, {
          description: result.deletedCounts
            ? `Deleted: ${result.deletedCounts.messages} messages, ${result.deletedCounts.emailAccounts} accounts, ${result.deletedCounts.users} users`
            : undefined,
        });
        setOpen(false);
        setConfirmText('');

        // Reload the page after successful deletion
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to clear test data', {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error('Failed to clear test data', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="border-destructive/50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Clear All Test Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Remove all test data from the database, including test users, email accounts, messages, and notifications.
            This action is permanent and cannot be undone.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium mb-1">What will be deleted:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Test user accounts (test@example.com, admin@example.com)</li>
              <li>• All email accounts marked as test data</li>
              <li>• All messages, notifications, and custom folders marked as test data</li>
              <li>• OAuth tokens for test accounts</li>
            </ul>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Test Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription className="space-y-3">
                  <p>
                    This action <strong>cannot be undone</strong>. This will permanently delete all test data from the
                    database.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-text">
                      Type <strong>DELETE TEST DATA</strong> to confirm:
                    </Label>
                    <Input
                      id="confirm-text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE TEST DATA"
                      className="font-mono"
                    />
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isClearing || confirmText !== 'DELETE TEST DATA'}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Test Data
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
