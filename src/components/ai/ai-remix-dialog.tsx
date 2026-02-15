'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AIRemixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onAccept: (rewritten: string, suggestedSubject?: string) => void;
}

type Tone = 'professional' | 'friendly' | 'brief' | 'detailed';

export function AIRemixDialog({ open, onOpenChange, content, onAccept }: AIRemixDialogProps) {
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    original: string;
    rewritten: string;
    suggested_subject?: string;
  } | null>(null);

  const handleRemix = async () => {
    if (!content.trim()) {
      toast.error('Please write some content first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tone }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remix email');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Remix error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remix email');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result.rewritten, result.suggested_subject);
      setResult(null);
      onOpenChange(false);
      toast.success('Email remixed successfully');
    }
  };

  const handleReject = () => {
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Remix
          </DialogTitle>
          <DialogDescription>
            Rewrite your email in a different tone while maintaining the original intent
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label>Select Tone</Label>
              <RadioGroup value={tone} onValueChange={(v) => setTone(v as Tone)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="font-normal cursor-pointer">
                    Professional — Formal and business-appropriate
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friendly" id="friendly" />
                  <Label htmlFor="friendly" className="font-normal cursor-pointer">
                    Friendly — Warm and conversational
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="brief" id="brief" />
                  <Label htmlFor="brief" className="font-normal cursor-pointer">
                    Brief — Concise and to-the-point
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="detailed" />
                  <Label htmlFor="detailed" className="font-normal cursor-pointer">
                    Detailed — Comprehensive and thorough
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRemix} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Remixing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Remix Email
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Original</Label>
                <div className="mt-1 p-4 rounded-lg bg-muted/50 text-sm max-h-60 overflow-y-auto">
                  {result.original}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rewritten ({tone})</Label>
                <div className="mt-1 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm max-h-60 overflow-y-auto">
                  {result.rewritten}
                </div>
              </div>
            </div>

            {result.suggested_subject && (
              <div>
                <Label className="text-xs text-muted-foreground">Suggested Subject</Label>
                <div className="mt-1 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  {result.suggested_subject}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAccept} className="flex-1">
                Accept Rewrite
              </Button>
              <Button variant="outline" onClick={handleReject} className="flex-1">
                Try Different Tone
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
