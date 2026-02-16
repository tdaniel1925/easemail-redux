/**
 * useSnooze Hook
 * Manages email snoozing state and actions
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export interface SnoozeParams {
  messageId: string;
  snoozeUntil: Date;
  originalFolderType: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'custom';
}

interface UseSnoozeReturn {
  isSnoozing: boolean;
  snoozeEmail: (params: SnoozeParams) => Promise<boolean>;
  unsnoozeEmail: (messageId: string) => Promise<boolean>;
}

export function useSnooze(): UseSnoozeReturn {
  const [isSnoozing, setIsSnoozing] = useState(false);

  const snoozeEmail = useCallback(async (params: SnoozeParams): Promise<boolean> => {
    setIsSnoozing(true);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return false;
      }

      // Insert snooze record
      const { error: insertError } = await supabase.from('snoozed_emails').insert({
        user_id: user.id,
        message_id: params.messageId,
        snooze_until: params.snoozeUntil.toISOString(),
        original_folder_type: params.originalFolderType,
        unsnoozed: false,
      });

      if (insertError) {
        console.error('Error snoozing email:', insertError);
        toast.error('Failed to snooze email');
        return false;
      }

      toast.success('Email snoozed successfully');
      return true;
    } catch (error: any) {
      console.error('Snooze error:', error);
      toast.error(error.message || 'Failed to snooze email');
      return false;
    } finally {
      setIsSnoozing(false);
    }
  }, []);

  const unsnoozeEmail = useCallback(async (messageId: string): Promise<boolean> => {
    setIsSnoozing(true);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return false;
      }

      // Mark as unsnoozed
      const { error: updateError } = await supabase
        .from('snoozed_emails')
        .update({ unsnoozed: true })
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('unsnoozed', false);

      if (updateError) {
        console.error('Error unsnoozing email:', updateError);
        toast.error('Failed to unsnooze email');
        return false;
      }

      toast.success('Email unsnoozed successfully');
      return true;
    } catch (error: any) {
      console.error('Unsnooze error:', error);
      toast.error(error.message || 'Failed to unsnooze email');
      return false;
    } finally {
      setIsSnoozing(false);
    }
  }, []);

  return {
    isSnoozing,
    snoozeEmail,
    unsnoozeEmail,
  };
}
