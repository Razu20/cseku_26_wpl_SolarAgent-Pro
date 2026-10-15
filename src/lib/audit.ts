import { db } from '../db/client';
import { auditLog } from '../db/schema';
export type AuditEvent = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export async function createAuditEvent(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
): Promise<AuditEvent> {
  await db.insert(auditLog).values({ actor, action, entityType, entityId, metadata: details });
  return {
    actor,
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };
}

