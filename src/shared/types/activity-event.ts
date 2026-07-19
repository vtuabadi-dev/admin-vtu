/**
 * Standardized Activity Event Contract
 * Ensures all actions across Master Data are uniformly recorded for the EAC.
 */

export enum MasterDataEventAction {
  CREATED = "MASTER_CREATED",
  UPDATED = "MASTER_UPDATED",
  ACTIVATED = "MASTER_ACTIVATED",
  DEACTIVATED = "MASTER_DEACTIVATED",
  ARCHIVED = "MASTER_ARCHIVED",
  RESTORED = "MASTER_RESTORED",
  DELETED = "MASTER_DELETED",
  IMPORTED = "MASTER_IMPORTED",
  EXPORTED = "MASTER_EXPORTED",
  BULK_UPDATED = "MASTER_BULK_UPDATED",
  BULK_ARCHIVED = "MASTER_BULK_ARCHIVED",
  BULK_DELETED = "MASTER_BULK_DELETED",
}

export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface IStandardizedActivityEvent {
  eventId: string; // Unique event identifier
  entity: string; // Entity name e.g., "JenisPaket"
  entityId: string; // Primary Key
  action: MasterDataEventAction;
  
  actor: {
    userId: string;
    role: string;
    name?: string;
  };
  
  timestamp: string | Date;
  correlationId?: string; // For linking chained events
  parentEventId?: string; // If this event is spawned by another event
  
  severity: EventSeverity;
  source: string; // e.g., "web_admin", "api_import", "system_job"
  
  oldValue?: Record<string, any>; // Snapshot before change
  newValue?: Record<string, any>; // Snapshot after change
}
