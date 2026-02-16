'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartReply {
  text: string;
  tone: 'professional' | 'friendly' | 'brief';
}

interface SmartReplyButtonsProps {
  messageId: string;
  onSelectReply: (replyText: string, tone: string) => void;
  className?: string;
}

export function SmartReplyButtons({
  messageId,
  onSelectReply,
  className,
}: SmartReplyButtonsProps) {
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchSmartReplies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch smart replies');
      }

      const data = await response.json();
      if (data.success && data.replies) {
        setReplies(data.replies);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Smart reply error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  useEffect(() => {
    if (expanded && replies.length === 0) {
      fetchSmartReplies();
    }
  }, [expanded, replies.length, fetchSmartReplies]);

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional':
        return 'border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950';
      case 'friendly':
        return 'border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950';
      case 'brief':
        return 'border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950';
      default:
        return 'border-muted';
    }
  };

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case 'professional':
        return 'Professional';
      case 'friendly':
        return 'Friendly';
      case 'brief':
        return 'Brief';
      default:
        return tone;
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(true)}
        className={cn('gap-2', className)}
      >
        <Sparkles className="h-4 w-4" />
        Smart Replies
      </Button>
    );
  }

  return (
    <Card className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium">AI Suggested Replies</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(false)}
        >
          Collapse
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Generating replies...
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && replies.length > 0 && (
        <div className="space-y-2">
          {replies.map((reply, index) => (
            <button
              key={index}
              onClick={() => onSelectReply(reply.text, reply.tone)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                getToneColor(reply.tone)
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {getToneLabel(reply.tone)}
                </span>
              </div>
              <p className="text-sm line-clamp-3">
                {reply.text}
              </p>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && replies.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No suggestions available
        </p>
      )}
    </Card>
  );
}
