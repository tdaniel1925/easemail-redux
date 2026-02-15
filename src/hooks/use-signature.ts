'use client';

/**
 * Hook for managing email signatures
 * Fetches and manages user's email signatures for use in composer
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Signature } from '@/types/database';

export interface UseSignatureOptions {
  // Filter signatures by email account ID
  accountId?: string;
  // Auto-select default signature
  autoSelectDefault?: boolean;
}

/**
 * Hook to manage email signatures
 *
 * @param options - Configuration options
 * @returns Signatures data and mutation functions
 *
 * @example
 * ```tsx
 * const { signatures, defaultSignature, isLoading } = useSignature({
 *   accountId: currentAccountId,
 *   autoSelectDefault: true
 * });
 * ```
 */
export function useSignature(options: UseSignatureOptions = {}) {
  const { accountId, autoSelectDefault = true } = options;
  const queryClient = useQueryClient();
  const supabase = createClient();

  /**
   * Fetch signatures query
   */
  const {
    data: signatures,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['signatures', accountId],
    queryFn: async () => {
      let query = supabase
        .from('signatures')
        .select('*')
        .is('archived_at', null)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by account if specified
      if (accountId) {
        query = query.eq('email_account_id', accountId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch signatures: ${error.message}`);
      }

      return (data || []) as Signature[];
    },
  });

  /**
   * Get default signature (first one marked as default, or first in list)
   */
  const defaultSignature = autoSelectDefault
    ? signatures?.find((sig) => sig.is_default) || signatures?.[0] || null
    : null;

  /**
   * Create a new signature
   */
  const createSignature = useMutation({
    mutationFn: async (params: {
      name: string;
      content_html: string;
      content_text?: string;
      email_account_id?: string;
      is_default?: boolean;
    }) => {
      // Get current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('signatures')
        .insert({
          name: params.name,
          content_html: params.content_html,
          content_text: params.content_text || null,
          email_account_id: params.email_account_id || null,
          is_default: params.is_default || false,
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create signature: ${error.message}`);
      }

      return data as Signature;
    },
    onSuccess: () => {
      // Invalidate signatures query to refetch
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  /**
   * Update an existing signature
   */
  const updateSignature = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      content_html?: string;
      content_text?: string;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('signatures')
        .update({
          name: params.name,
          content_html: params.content_html,
          content_text: params.content_text,
          is_default: params.is_default,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update signature: ${error.message}`);
      }

      return data as Signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  /**
   * Delete a signature (soft delete via archived_at)
   */
  const deleteSignature = useMutation({
    mutationFn: async (signatureId: string) => {
      const { error } = await supabase
        .from('signatures')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', signatureId);

      if (error) {
        throw new Error(`Failed to delete signature: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  /**
   * Set a signature as default (unset others)
   */
  const setDefaultSignature = useMutation({
    mutationFn: async (signatureId: string) => {
      // First, unset all default signatures for this account
      if (accountId) {
        await supabase
          .from('signatures')
          .update({ is_default: false })
          .eq('email_account_id', accountId);
      }

      // Then set the new default
      const { error } = await supabase
        .from('signatures')
        .update({ is_default: true })
        .eq('id', signatureId);

      if (error) {
        throw new Error(`Failed to set default signature: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });

  return {
    signatures: signatures || [],
    defaultSignature,
    isLoading,
    error: error?.message || null,
    createSignature: createSignature.mutate,
    updateSignature: updateSignature.mutate,
    deleteSignature: deleteSignature.mutate,
    setDefaultSignature: setDefaultSignature.mutate,
    isCreating: createSignature.isPending,
    isUpdating: updateSignature.isPending,
    isDeleting: deleteSignature.isPending,
  };
}
