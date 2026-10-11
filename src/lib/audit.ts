export type AuditEvent = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export function createAuditEvent(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
): AuditEvent {
  return {
    actor,
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };
}

