import { createClient } from '@/lib/supabase/server';

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'impersonate' | 'export' | 'bulk_action';

export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  targetUserId?: string;
  organizationId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase
      .from('audit_logs')
      .insert({
        user_id: params.userId,
        target_user_id: params.targetUserId || null,
        organization_id: params.organizationId || null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        details: params.details || {},
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      } as any);
  } catch (error) {
    // Log audit failures but don't block the main operation
    console.error('Failed to create audit log:', error);
  }
}

export async function logAuthEvent(
  userId: string,
  action: 'login' | 'logout',
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entityType: 'auth',
    details,
    ipAddress,
    userAgent,
  });
}

export async function logUserCreation(
  userId: string,
  createdUserId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'create',
    entityType: 'user',
    entityId: createdUserId,
    targetUserId: createdUserId,
    details,
  });
}

export async function logImpersonation(
  adminUserId: string,
  targetUserId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    userId: adminUserId,
    action: 'impersonate',
    entityType: 'user',
    entityId: targetUserId,
    targetUserId,
    details: { reason },
    ipAddress,
  });
}
