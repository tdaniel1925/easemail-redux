'use server';

import { createClient } from '@/lib/supabase/server';
import type { Message } from '@/types/message';
import type { EmailRule } from '@/types/email-rule';

// Rule condition types from SPEC-AUTOMATION.md AUTO-2
export type ConditionField =
  | 'from_email'
  | 'from_name'
  | 'to_email'
  | 'subject'
  | 'body_text'
  | 'has_attachments'
  | 'importance'
  | 'is_unread';

export type ConditionOperator =
  | 'equals'
  | 'contains'
  | 'ends_with'
  | 'starts_with'
  | 'regex';

export interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | boolean;
}

// Rule action types from SPEC-AUTOMATION.md AUTO-2
export type ActionType =
  | 'move_to_folder'
  | 'add_label'
  | 'remove_label'
  | 'mark_read'
  | 'mark_unread'
  | 'mark_starred'
  | 'archive'
  | 'delete'
  | 'forward_to'
  | 'categorize'
  | 'notify';

export interface RuleAction {
  type: ActionType;
  params?: Record<string, string | string[]>;
}

/**
 * Evaluate a single condition against a message
 */
function evaluateCondition(condition: Condition, message: Message): boolean {
  const { field, operator, value } = condition;

  // Get field value from message
  let fieldValue: string | boolean | null = null;

  switch (field) {
    case 'from_email':
      fieldValue = message.from_email || '';
      break;
    case 'from_name':
      fieldValue = message.from_name || '';
      break;
    case 'to_email':
      // Check if any recipient matches
      const recipients = message.to_recipients as Array<{ email: string }> || [];
      fieldValue = recipients.map(r => r.email).join(',');
      break;
    case 'subject':
      fieldValue = message.subject || '';
      break;
    case 'body_text':
      fieldValue = message.body_text || '';
      break;
    case 'has_attachments':
      fieldValue = message.has_attachments;
      break;
    case 'importance':
      fieldValue = message.importance || 'normal';
      break;
    case 'is_unread':
      fieldValue = message.is_unread;
      break;
    default:
      return false;
  }

  // For boolean fields
  if (typeof fieldValue === 'boolean') {
    return fieldValue === value;
  }

  // For string fields
  const fieldStr = String(fieldValue).toLowerCase();
  const valueStr = String(value).toLowerCase();

  switch (operator) {
    case 'equals':
      return fieldStr === valueStr;
    case 'contains':
      return fieldStr.includes(valueStr);
    case 'ends_with':
      return fieldStr.endsWith(valueStr);
    case 'starts_with':
      return fieldStr.startsWith(valueStr);
    case 'regex':
      try {
        const regex = new RegExp(valueStr, 'i');
        return regex.test(fieldStr);
      } catch {
        console.warn('Invalid regex pattern:', valueStr);
        return false;
      }
    default:
      return false;
  }
}

/**
 * Execute a rule action on a message
 */
async function executeAction(
  action: RuleAction,
  message: Message,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  switch (action.type) {
    case 'move_to_folder': {
      const folderType = action.params?.folder_type as import('@/types/database').FolderType;
      if (!folderType) return;

      await supabase
        .from('messages')
        .update({ folder_type: folderType })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'add_label': {
      const labelId = action.params?.label_id as string;
      if (!labelId) return;

      // Insert if not exists
      await supabase
        .from('message_labels')
        .insert({
          message_id: message.id,
          label_id: labelId,
        })
        .select()
        .maybeSingle();
      break;
    }

    case 'remove_label': {
      const labelId = action.params?.label_id as string;
      if (!labelId) return;

      await supabase
        .from('message_labels')
        .delete()
        .eq('message_id', message.id)
        .eq('label_id', labelId);
      break;
    }

    case 'mark_read': {
      await supabase
        .from('messages')
        .update({ is_unread: false })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'mark_unread': {
      await supabase
        .from('messages')
        .update({ is_unread: true })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'mark_starred': {
      await supabase
        .from('messages')
        .update({ is_starred: true })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'archive': {
      await supabase
        .from('messages')
        .update({ folder_type: 'archive' })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'delete': {
      await supabase
        .from('messages')
        .update({ folder_type: 'trash' })
        .eq('id', message.id)
        .eq('user_id', userId);
      break;
    }

    case 'categorize': {
      const category = action.params?.category as string;
      if (!category) return;

      // Append category to categories array
      const currentCategories = (message.categories || []) as string[];
      if (!currentCategories.includes(category)) {
        await supabase
          .from('messages')
          .update({ categories: [...currentCategories, category] })
          .eq('id', message.id)
          .eq('user_id', userId);
      }
      break;
    }

    case 'notify': {
      const notifMessage = action.params?.message as string;
      if (!notifMessage) return;

      await supabase.from('notification_queue').insert({
        user_id: userId,
        type: 'info',
        title: 'Email Rule Triggered',
        message: notifMessage,
        link: `/app/inbox?message=${message.id}`,
        read: false,
      });
      break;
    }

    case 'forward_to': {
      // TODO: Implement email forwarding in Stage 7 (requires sending email)
      console.warn('forward_to action not yet implemented');
      break;
    }

    default:
      console.warn('Unknown action type:', action.type);
  }
}

/**
 * Evaluate all active rules for a user against a message
 * Called after message.received event (from email sync)
 */
export async function evaluateRules(
  userId: string,
  message: Message
): Promise<void> {
  const supabase = await createClient();

  // Fetch active rules sorted by priority
  const { data: rules, error } = await supabase
    .from('email_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching email rules:', error);
    return;
  }

  if (!rules || rules.length === 0) {
    return;
  }

  // Evaluate each rule
  for (const rule of rules as EmailRule[]) {
    const conditions = rule.conditions as unknown as Condition[];
    const actions = rule.actions as unknown as RuleAction[];
    const matchMode = rule.match_mode; // 'all' or 'any'

    // Evaluate all conditions
    const matches =
      matchMode === 'all'
        ? conditions.every((c) => evaluateCondition(c, message))
        : conditions.some((c) => evaluateCondition(c, message));

    if (matches) {
      // Execute all actions
      for (const action of actions) {
        try {
          await executeAction(action, message, userId);
        } catch (error) {
          console.error('Error executing action:', action.type, error);
        }
      }

      // Increment applied count
      await supabase
        .from('email_rules')
        .update({ applied_count: (rule.applied_count || 0) + 1 })
        .eq('id', rule.id);

      // Stop after first match (rules are priority-ordered)
      break;
    }
  }
}
