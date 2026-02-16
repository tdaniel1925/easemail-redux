'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSmartComposeOptions {
  currentText: string;
  subject?: string;
  replyingToMessageId?: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface SmartComposeSuggestion {
  suggestion: string;
  confidence: number;
}

export function useSmartCompose({
  currentText,
  subject,
  replyingToMessageId,
  enabled = true,
  debounceMs = 1000,
}: UseSmartComposeOptions) {
  const [suggestion, setSuggestion] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestion = useCallback(async () => {
    if (!enabled || currentText.length < 10) {
      setSuggestion('');
      setConfidence(0);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/smart-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentText,
          subject,
          replyingToMessageId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestion');
      }

      const data: SmartComposeSuggestion & { success: boolean } = await response.json();

      if (data.success) {
        setSuggestion(data.suggestion || '');
        setConfidence(data.confidence || 0);
      } else {
        setSuggestion('');
        setConfidence(0);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Smart compose error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSuggestion('');
      setConfidence(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentText, subject, replyingToMessageId, enabled]);

  // Debounce the fetch
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!enabled || currentText.length < 10) {
      setSuggestion('');
      setConfidence(0);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestion();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentText, subject, replyingToMessageId, enabled, debounceMs, fetchSuggestion]);

  const acceptSuggestion = useCallback(() => {
    const accepted = suggestion;
    setSuggestion('');
    setConfidence(0);
    return accepted;
  }, [suggestion]);

  const dismissSuggestion = useCallback(() => {
    setSuggestion('');
    setConfidence(0);
  }, []);

  return {
    suggestion,
    confidence,
    isLoading,
    error,
    acceptSuggestion,
    dismissSuggestion,
  };
}
