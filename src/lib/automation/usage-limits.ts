'use server';

import { createClient } from '@/lib/supabase/server';
import type { PlanType } from '@/types/database';

// Plan-based feature limits from SPEC-AUTOMATION.md AUTO-3
export const PLAN_LIMITS: Record<
  PlanType,
  Record<string, number>
> = {
  FREE: {
    ai_remix: 5,
    ai_dictate: 3,
    ai_event_extract: 5,
    email_rules: 3,
    scheduled_sends_monthly: 0,
    email_accounts: 1,
    sms_messages_monthly: 0,
    email_templates: 3,
    custom_labels: 5,
    webhooks: 0,
    api_keys: 0,
  },
  PRO: {
    ai_remix: -1, // unlimited
    ai_dictate: -1,
    ai_event_extract: -1,
    email_rules: 25,
    scheduled_sends_monthly: 50,
    email_accounts: 3,
    sms_messages_monthly: 0,
    email_templates: 25,
    custom_labels: 25,
    webhooks: 0,
    api_keys: 0,
  },
  BUSINESS: {
    ai_remix: -1,
    ai_dictate: -1,
    ai_event_extract: -1,
    email_rules: -1,
    scheduled_sends_monthly: -1,
    email_accounts: 10,
    sms_messages_monthly: 100,
    email_templates: -1,
    custom_labels: -1,
    webhooks: 5,
    api_keys: 3,
  },
  ENTERPRISE: {
    ai_remix: -1,
    ai_dictate: -1,
    ai_event_extract: -1,
    email_rules: -1,
    scheduled_sends_monthly: -1,
    email_accounts: -1,
    sms_messages_monthly: -1,
    email_templates: -1,
    custom_labels: -1,
    webhooks: -1,
    api_keys: -1,
  },
};

export interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Check if user has quota remaining for a feature based on their plan
 * Daily limits apply to AI features, monthly limits apply to sends/SMS
 */
export async function checkFeatureLimit(
  userId: string,
  feature: string,
  plan: PlanType
): Promise<UsageCheckResult> {
  const limits = PLAN_LIMITS[plan];
  const featureLimit = limits[feature];

  // Unlimited
  if (featureLimit === -1) {
    return { allowed: true, remaining: Infinity, limit: -1 };
  }

  // Feature not available on this plan
  if (featureLimit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const supabase = await createClient();

  // Determine time window (daily for AI, monthly for sends/SMS)
  const isMonthly = feature.includes('_monthly');
  const now = new Date();
  let windowStart: string;

  if (isMonthly) {
    // First day of current month
    windowStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else {
    // Today at 00:00:00 UTC
    windowStart = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z').toISOString();
  }

  // Count usage in current window
  const { count, error } = await supabase
    .from('usage_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('timestamp', windowStart);

  if (error) {
    console.error('Error checking feature limit:', error);
    // Fail open - allow if we can't check
    return { allowed: true, remaining: featureLimit, limit: featureLimit };
  }

  const used = count || 0;

  return {
    allowed: used < featureLimit,
    remaining: Math.max(0, featureLimit - used),
    limit: featureLimit,
  };
}

/**
 * Track usage of a feature
 */
export async function trackFeatureUsage(
  userId: string,
  organizationId: string | null,
  feature: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('usage_tracking').insert({
    user_id: userId,
    organization_id: organizationId,
    feature,
    count: 1,
    metadata: (metadata || {}) as import('@/types/database').Json,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error('Error tracking feature usage:', error);
  }
}

/**
 * Get user's current plan (from their org or individual subscription)
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = await createClient();

  // Check if user is in an organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (membership) {
    // Get org plan
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', membership.organization_id)
      .single();

    return org?.plan || 'FREE';
  }

  // Check individual subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return subscription?.plan || 'FREE';
}
