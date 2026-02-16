/**
 * Snooze Dialog Component
 * Dialog for selecting when to snooze an email
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { snoozeTimePresets, formatSnoozeTime } from '@/lib/utils/snooze';
import { Clock, Calendar } from 'lucide-react';

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnooze: (snoozeUntil: Date) => void;
  isLoading?: boolean;
}

export function SnoozeDialog({
  open,
  onOpenChange,
  onSnooze,
  isLoading = false,
}: SnoozeDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('09:00');

  const presets = snoozeTimePresets();

  const handlePresetSelect = (presetValue: string) => {
    setSelectedPreset(presetValue);

    if (presetValue === 'custom') {
      // Set custom date to tomorrow by default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      setCustomDate(dateStr);
    } else {
      setCustomDate('');
    }
  };

  const handleSnooze = () => {
    let snoozeDate: Date;

    if (selectedPreset === 'custom') {
      if (!customDate || !customTime) {
        return;
      }
      snoozeDate = new Date(`${customDate}T${customTime}`);
    } else {
      const preset = presets.find((p) => p.value === selectedPreset);
      if (!preset) return;
      snoozeDate = preset.getDate();
    }

    onSnooze(snoozeDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Snooze Email</DialogTitle>
          <DialogDescription>
            Choose when you want this email to reappear in your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetSelect(preset.value)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                selectedPreset === preset.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {preset.value === 'custom' ? (
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="text-left">
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.value !== 'custom' && formatSnoozeTime(preset.getDate())}
                    {preset.value === 'custom' && preset.description}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {selectedPreset === 'custom' && (
            <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary">
              <div className="space-y-2">
                <Label htmlFor="custom-date">Date</Label>
                <Input
                  id="custom-date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-time">Time</Label>
                <Input
                  id="custom-time"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSnooze}
            disabled={!selectedPreset || isLoading}
          >
            {isLoading ? 'Snoozing...' : 'Snooze'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
