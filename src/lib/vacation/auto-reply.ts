/**
 * Vacation Auto-Reply Handler
 * Automatically sends vacation responses to incoming emails
 */

import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/providers';
import { getValidToken } from '@/lib/providers/token-manager';

interface Message {
  id: string;
  user_id: string;
  email_account_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  folder_type: string | null;
}

/**
 * Check for active vacation responder and send auto-reply if needed
 */
export async function handleVacationAutoReply(message: Message): Promise<void> {
  try {
    // Only auto-reply to inbox messages (not sent, drafts, etc.)
    if (message.folder_type !== 'inbox') {
      return;
    }

    // Get vacation responder for this account
    const supabase = await createClient();
    const { data: vacationResponder, error } = await supabase
      .from('vacation_responder' as any)
      .select('*')
      .eq('account_id', message.email_account_id)
      .eq('enabled', true)
      .maybeSingle();

    if (error || !vacationResponder) {
      // No active vacation responder
      return;
    }

    // Check if vacation is currently active based on dates
    const now = new Date();
    const startDate = (vacationResponder as any).start_date ? new Date((vacationResponder as any).start_date) : null;
    const endDate = (vacationResponder as any).end_date ? new Date((vacationResponder as any).end_date) : null;

    const isActive =
      (!startDate || now >= startDate) &&
      (!endDate || now <= endDate);

    if (!isActive) {
      return;
    }

    // Check if we've already replied to this sender during this vacation period
    const { data: existingReply } = await supabase
      .from('vacation_replies' as any)
      .select('id')
      .eq('vacation_responder_id', (vacationResponder as any).id)
      .eq('sender_email', message.from_email)
      .maybeSingle();

    if (existingReply) {
      console.warn(`[Vacation] Already replied to ${message.from_email}, skipping`);
      return;
    }

    // Get email account details
    const { data: emailAccount } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', message.email_account_id)
      .single();

    if (!emailAccount) {
      console.error('[Vacation] Email account not found');
      return;
    }

    // Get valid token
    const tokenResult = await getValidToken(emailAccount.id);
    if (!tokenResult.token) {
      console.error('[Vacation] Invalid token, cannot send auto-reply');
      return;
    }

    // Get provider
    const provider = getProvider(emailAccount.provider as any);

    // Send vacation auto-reply
    const replySubject = message.subject
      ? `Re: ${message.subject.replace(/^Re:\s*/i, '')}`
      : 'Automatic reply';

    await provider.sendMessage(tokenResult.token, {
      to: [{ email: message.from_email, name: message.from_name }],
      subject: replySubject,
      body_text: (vacationResponder as any).message,
      body_html: `<p>${(vacationResponder as any).message.replace(/\n/g, '<br>')}</p>`,
      reply_to_message_id: undefined, // Don't set in-reply-to to avoid threading issues
    });

    // Log the vacation reply
    await supabase.from('vacation_replies' as any).insert({
      vacation_responder_id: (vacationResponder as any).id,
      sender_email: message.from_email,
      replied_at: new Date().toISOString(),
    });

    // Log event
    try {
      await supabase.from('events').insert({
        actor_id: message.user_id,
        event_type: 'email.vacation_auto_reply' as any,
        entity_type: 'message',
        entity_id: message.id,
        payload: {
          message_id: message.id,
          sender_email: message.from_email,
          vacation_responder_id: (vacationResponder as any).id,
        },
      });
    } catch (eventError) {
      console.error('[Vacation] Failed to log event:', eventError);
    }

    console.warn(`[Vacation] Auto-reply sent to ${message.from_email}`);
  } catch (error) {
    console.error('[Vacation] Auto-reply failed:', error);
    // Don't throw - vacation auto-reply failure shouldn't break email sync
  }
}
