import { LucideIcon } from "lucide-react";
import { LifecycleStatus } from "./master-data";

export interface MasterModuleMetadata {
  id: string; // e.g. "jenis-paket"
  entityName: string; // "JenisPaket"
  displayName: string; // "Jenis Paket"
  icon: string | LucideIcon;
  route: string; // "/admin/master-data/jenis-paket"
  permission: string; // "manage:jenis_paket"
  
  // Platform configuration
  searchableFields: string[];
  sortableFields: string[];
  defaultSort: string;
  displayField: string; // Field to show when referenced (e.g. "name")
  
  // Platform features toggles
  activityEnabled: boolean;
  auditEnabled: boolean;
  snapshotEnabled: boolean;
  
  // Lifecycle & Status support
  defaultStatus: LifecycleStatus;
  supportsDraft: boolean;
  supportsArchive: boolean;
  supportsActive: boolean;
  supportsDelete: boolean;
  
  // Behavior policies
  activePolicy: "AUTO" | "MANUAL_APPROVAL";
  deletePolicy: "HARD" | "SOFT" | "RESTRICTED";
  
  // Future Expansion
  futureFeatureFlags?: string[];
}

/**
 * MasterRegistry act as the Single Source of Truth for Platform Hardening.
 * Sidebar, Routes (dynamically if needed), and permissions read from here.
 * DO NOT hardcode entries in the UI anymore.
 * 
 * Note: Actual registration of modules like "JenisPaket" will happen 
 * when the specific Sprint for that module begins. 
 * For now, this is just the contract/platform.
 */
export const MasterRegistry: MasterModuleMetadata[] = [
  // Example entry to be added in Sprint 2:
  /*
  {
    id: "jenis-paket",
    entityName: "JenisPaket",
    displayName: "Jenis Paket",
    icon: "Package", // Will map to Lucide icon
    route: "/admin/master-data/jenis-paket",
    permission: "manage:jenis_paket",
    searchableFields: ["name", "description"],
    sortableFields: ["name", "created_at"],
    defaultSort: "-created_at",
    displayField: "name",
    activityEnabled: true,
    auditEnabled: true,
    snapshotEnabled: true,
    defaultStatus: LifecycleStatus.ACTIVE,
    supportsDraft: false,
    supportsArchive: true,
    supportsActive: true,
    supportsDelete: false, // RESTRICTED
    activePolicy: "AUTO",
    deletePolicy: "RESTRICTED",
  }
  */
];
