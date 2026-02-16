'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface SmartComposeSuggestionProps {
  suggestion: string;
  confidence: number;
  onAccept: () => string;
  onDismiss: () => void;
  className?: string;
}

export function SmartComposeSuggestion({
  suggestion,
  confidence,
  onAccept,
  onDismiss,
  className,
}: SmartComposeSuggestionProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape' && suggestion) {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, onAccept, onDismiss]);

  if (!suggestion || confidence < 0.5) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-sm',
        className
      )}
    >
      <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
      <span className="text-muted-foreground">
        {suggestion}
      </span>
      <span className="text-xs text-muted-foreground/70 border-l pl-2 ml-2">
        Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">Tab</kbd> to accept
      </span>
    </div>
  );
}

/**
 * Inline suggestion component for TipTap editor
 * Shows AI-generated text completions inline with the editor content
 */
export function InlineSmartComposeSuggestion({
  suggestion,
  confidence,
  onAccept,
  onDismiss,
}: Omit<SmartComposeSuggestionProps, 'className'>) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape' && suggestion) {
        e.preventDefault();
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [suggestion, onAccept, onDismiss]);

  if (!suggestion || confidence < 0.5) {
    return null;
  }

  return (
    <span
      className="inline-flex items-baseline gap-1 opacity-60 italic"
      contentEditable={false}
      suppressContentEditableWarning
    >
      <span className="text-muted-foreground">{suggestion}</span>
      <span className="text-xs text-muted-foreground/70">
        (Tab to accept)
      </span>
    </span>
  );
}
