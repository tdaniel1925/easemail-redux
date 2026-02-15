/**
 * AI Categorization Helper
 * Automatically categorizes messages during sync
 */

import { createClient } from '@/lib/supabase/server';
import { categorizeMessages, MessageForCategorization } from './client';

/**
 * Categorize new messages in batch
 * Called during email sync after messages are inserted
 */
export async function categorizeSyncedMessages(
  userId: string,
  messageIds: string[]
): Promise<void> {
  if (messageIds.length === 0) return;

  const supabase = await createClient();

  // Fetch messages for categorization
  const { data: messages, error: fetchError } = await supabase
    .from('messages')
    .select('id, from_email, from_name, subject, snippet')
    .in('id', messageIds)
    .eq('user_id', userId);

  if (fetchError || !messages || messages.length === 0) {
    console.error('Failed to fetch messages for categorization:', fetchError);
    return;
  }

  // Process in batches of 20
  const batchSize = 20;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    try {
      const toCategorize: MessageForCategorization[] = batch.map((msg) => ({
        id: msg.id,
        from_email: msg.from_email,
        from_name: msg.from_name,
        subject: msg.subject,
        snippet: msg.snippet,
      }));

      const categorized = await categorizeMessages(toCategorize);

      // Update messages with categories
      for (const result of categorized) {
        await supabase
          .from('messages')
          .update({ categories: [result.category] })
          .eq('id', result.id);
      }

      // Track usage
      await supabase.from('usage_tracking').insert({
        user_id: userId,
        feature: 'ai_categorize',
        count: batch.length,
        timestamp: new Date().toISOString(),
        metadata: { batch_size: batch.length, auto: true },
      });
    } catch (error) {
      console.error('Categorization batch failed:', error);
      // Continue with next batch even if this one fails
    }
  }
}
