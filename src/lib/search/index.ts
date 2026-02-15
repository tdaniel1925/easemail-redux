'use server';

import { createClient } from '@/lib/supabase/server';
import type { Message } from '@/types/message';
import type { FolderType } from '@/types/database';

export interface SearchFilters {
  from?: string;
  folder?: FolderType;
  hasAttachments?: boolean;
  isUnread?: boolean;
  after?: string; // ISO date
  before?: string; // ISO date
  label?: string; // label_id
}

export interface SearchResult {
  results: Message[];
  nextCursor?: string;
}

/**
 * Full-text search messages with filters and cursor pagination
 * Uses Postgres tsvector with weighted ranking (subject > sender > body)
 * See SPEC-AUTOMATION.md AUTO-7
 */
export async function searchMessages(
  userId: string,
  query: string,
  filters: SearchFilters = {},
  cursor?: string,
  limit: number = 20
): Promise<SearchResult> {
  const supabase = await createClient();

  let q = supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId);

  // Full-text search using websearch syntax
  // Supports: "exact phrase", word1 OR word2, -excluded
  if (query && query.trim()) {
    q = q.textSearch('search_vector', query, { type: 'websearch' });
  }

  // Apply filters
  if (filters.from) {
    q = q.ilike('from_email', `%${filters.from}%`);
  }

  if (filters.folder) {
    q = q.eq('folder_type', filters.folder);
  }

  if (filters.hasAttachments !== undefined) {
    q = q.eq('has_attachments', filters.hasAttachments);
  }

  if (filters.isUnread !== undefined) {
    q = q.eq('is_unread', filters.isUnread);
  }

  if (filters.after) {
    q = q.gte('message_date', filters.after);
  }

  if (filters.before) {
    q = q.lte('message_date', filters.before);
  }

  if (filters.label) {
    // Subquery for messages with label
    const { data: labeledMessages } = await supabase
      .from('message_labels')
      .select('message_id')
      .eq('label_id', filters.label);

    if (labeledMessages && labeledMessages.length > 0) {
      const messageIds = labeledMessages.map((ml) => ml.message_id);
      q = q.in('id', messageIds);
    } else {
      // No messages with this label - return empty
      return { results: [], nextCursor: undefined };
    }
  }

  // Cursor pagination (by message_date DESC)
  if (cursor) {
    q = q.lt('message_date', cursor);
  }

  // Order by date descending and limit
  q = q.order('message_date', { ascending: false }).limit(limit);

  const { data, error } = await q;

  if (error) {
    console.error('Error searching messages:', error);
    throw error;
  }

  return {
    results: (data as Message[]) || [],
    nextCursor:
      data && data.length === limit
        ? data[data.length - 1].message_date
        : undefined,
  };
}

/**
 * Search contacts by name, email, or company
 */
export async function searchContacts(
  userId: string,
  query: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  email: string;
  name: string | null;
  company: string | null;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('id, email, name, company')
    .eq('user_id', userId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
    .order('email_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching contacts:', error);
    return [];
  }

  return data || [];
}
