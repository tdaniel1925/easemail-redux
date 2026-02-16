'use client';

import { useState, useEffect } from 'react';
import { useVacation } from '@/hooks/use-vacation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VacationSettingsProps {
  accountId: string;
  accountEmail: string;
}

export function VacationSettings({ accountId, accountEmail }: VacationSettingsProps) {
  const {
    vacationResponder,
    isLoading,
    error,
    isSubmitting,
    isActive,
    setVacation,
  } = useVacation(accountId);

  const [enabled, setEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  // Initialize form with existing data
  useEffect(() => {
    if (vacationResponder) {
      setEnabled(vacationResponder.enabled);
      setStartDate(vacationResponder.start_date || '');
      setEndDate(vacationResponder.end_date || '');
      setMessage(vacationResponder.message);
    }
  }, [vacationResponder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    await setVacation({
      enabled,
      startDate: startDate || null,
      endDate: endDate || null,
      message: message.trim(),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vacation Responder</CardTitle>
          <CardDescription>Loading vacation responder settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vacation Responder</CardTitle>
        <CardDescription>
          Automatically reply to incoming emails for {accountEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load vacation settings'}
              </AlertDescription>
            </Alert>
          )}

          {isActive && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Vacation responder is currently active and replying to emails.
              </AlertDescription>
            </Alert>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vacation-enabled">Enable Vacation Responder</Label>
              <div className="text-sm text-muted-foreground">
                Automatically send replies to incoming emails
              </div>
            </div>
            <Switch
              id="vacation-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date (Optional)</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to start immediately
            </p>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date (Optional)</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSubmitting}
              min={startDate || undefined}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty for no end date
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="vacation-message">Auto-Reply Message</Label>
            <Textarea
              id="vacation-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Thank you for your email. I am currently out of office and will respond when I return..."
              rows={6}
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              This message will be sent once to each sender who emails you during your vacation
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
