import type { OperationalRole, EnterpriseRole, SystemPermission, PermissionCheck, PermissionAction, PermissionModule } from "@/shared/types";

// ── Enterprise Role Mapping ──────────────────────────────────

export function mapToEnterpriseRole(role: OperationalRole | undefined | null): EnterpriseRole {
  if (!role) return "VIEWER";
  const mapping: Record<OperationalRole, EnterpriseRole> = {
    super_admin: "SUPER_ADMIN",
    admin_operasional: "OWNER",
    admin_pembayaran: "ADMIN",
    admin_manifest: "ADMIN",
    admin_dokumen: "STAFF",
    tour_leader: "VIEWER",
    jamaah: "VIEWER",
  };
  return mapping[role];
}

export function isSuperAdmin(role: OperationalRole | undefined | null): boolean {
  return role === "super_admin";
}

export function hasEnterpriseRole(role: OperationalRole | undefined | null, ...allowed: EnterpriseRole[]): boolean {
  const enterprise = mapToEnterpriseRole(role);
  return allowed.includes(enterprise);
}

// ── Named Permission System ──────────────────────────────────

const SUPER_ADMIN_PERMISSIONS: SystemPermission[] = [
  "VIEW_AUDIT_LOG", "MANAGE_USERS", "MANAGE_SYSTEM", "VIEW_REPORTS",
  "MANAGE_PACKAGES", "MANAGE_JAMAAH", "MANAGE_PAYMENTS", "MANAGE_EXPORTS",
  "VIEW_HEALTH_MONITORING", "VIEW_MAINTENANCE",
];

const OWNER_PERMISSIONS: SystemPermission[] = [
  "VIEW_REPORTS", "MANAGE_PACKAGES", "MANAGE_JAMAAH",
  "MANAGE_PAYMENTS", "MANAGE_EXPORTS",
];

const ADMIN_PERMISSIONS: SystemPermission[] = [
  "VIEW_REPORTS", "MANAGE_PACKAGES", "MANAGE_JAMAAH",
  "MANAGE_PAYMENTS", "MANAGE_EXPORTS",
];

const STAFF_PERMISSIONS: SystemPermission[] = [
  "MANAGE_JAMAAH",
];

const VIEWER_PERMISSIONS: SystemPermission[] = [];

const ENTERPRISE_PERMISSIONS: Record<EnterpriseRole, Set<SystemPermission>> = {
  SUPER_ADMIN: new Set(SUPER_ADMIN_PERMISSIONS),
  OWNER: new Set(OWNER_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
  STAFF: new Set(STAFF_PERMISSIONS),
  VIEWER: new Set(VIEWER_PERMISSIONS),
};

export function hasPermission(role: OperationalRole | undefined | null, permission: SystemPermission): boolean {
  const enterprise = mapToEnterpriseRole(role);
  return ENTERPRISE_PERMISSIONS[enterprise]?.has(permission) ?? false;
}

// ── Sidebar / UI Visibility Rules ────────────────────────────

export function isSidebarItemVisible(role: OperationalRole | undefined | null, sectionTitle: string, itemLabel: string): boolean {
  const key = `${sectionTitle}-${itemLabel}`;
  const enterprise = mapToEnterpriseRole(role);

  // SUPER_ADMIN sees everything
  if (enterprise === "SUPER_ADMIN") return true;

  // Hide SUPER_ADMIN-only items
  const superAdminOnlyKeys = new Set([
    "LAINNYA-Audit Trail",
    "LAINNYA-Kesehatan Sistem",
    "LAINNYA-Maintenance",
  ]);
  if (superAdminOnlyKeys.has(key)) return false;

  // VIEWER sees only read-only operational items
  if (enterprise === "VIEWER") {
    const viewableKeys = new Set([
      "UTAMA-Dashboard",
      "PAKET UMROH-Paket Umroh",
      "JAMAAH-Jamaah",
      "PEMBAYARAN-Pembayaran",
      "MANIFEST-Manifest",
      "LAINNYA-Laporan",
    ]);
    return viewableKeys.has(key);
  }

  // STAFF+ sees everything except super-admin-only
  return true;
}

// ── Route Protection ─────────────────────────────────────────

const SUPER_ADMIN_ONLY_ROUTES = [
  "/admin/audit-log",
  "/api/audit",
  "/admin/kesehatan-sistem",
  "/admin/maintenance",
];

export function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

// ── Module Permission Matrix (preserved for API route guards) ──

const ROLE_PERMISSIONS: Record<OperationalRole, Record<string, PermissionCheck>> = {
  super_admin: {},
  admin_operasional: {},
  admin_pembayaran: {},
  admin_manifest: {},
  admin_dokumen: {},
  tour_leader: {},
  jamaah: {},
};

const FULL: PermissionCheck = {
  canView: true, canCreate: true, canEdit: true,
  canApprove: true, canExport: true, canDelete: true,
};
const VIEW_EXPORT: PermissionCheck = {
  canView: true, canCreate: false, canEdit: false,
  canApprove: false, canExport: true, canDelete: false,
};
const VIEW_ONLY: PermissionCheck = {
  canView: true, canCreate: false, canEdit: false,
  canApprove: false, canExport: false, canDelete: false,
};
const NONE: PermissionCheck = {
  canView: false, canCreate: false, canEdit: false,
  canApprove: false, canExport: false, canDelete: false,
};
const FULL_NO_DELETE: PermissionCheck = {
  canView: true, canCreate: true, canEdit: true,
  canApprove: true, canExport: true, canDelete: false,
};

function buildMatrix() {
  const modules: PermissionModule[] = [
    "dokumen", "pembayaran", "manifest", "rooming",
    "keberangkatan", "jamaah", "sistem", "audit", "export", "backup",
    "ocr-settings",
  ];

  modules.forEach((m) => { ROLE_PERMISSIONS.super_admin[m] = FULL; });

  modules.forEach((m) => {
    ROLE_PERMISSIONS.admin_operasional[m] = m === "backup" ? VIEW_ONLY : (m === "sistem" || m === "ocr-settings" ? FULL_NO_DELETE : FULL);
  });

  modules.forEach((m) => {
    if (m === "pembayaran" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_pembayaran[m] = FULL;
    } else if (m === "export") {
      ROLE_PERMISSIONS.admin_pembayaran[m] = VIEW_EXPORT;
    } else {
      ROLE_PERMISSIONS.admin_pembayaran[m] = VIEW_ONLY;
    }
  });

  modules.forEach((m) => {
    if (m === "manifest" || m === "rooming" || m === "jamaah" || m === "keberangkatan") {
      ROLE_PERMISSIONS.admin_manifest[m] = FULL_NO_DELETE;
    } else if (m === "dokumen") {
      ROLE_PERMISSIONS.admin_manifest[m] = {
        canView: true, canCreate: true, canEdit: true,
        canApprove: false, canExport: true, canDelete: false,
      };
    } else {
      ROLE_PERMISSIONS.admin_manifest[m] = VIEW_ONLY;
    }
  });

  modules.forEach((m) => {
    if (m === "dokumen" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_dokumen[m] = FULL_NO_DELETE;
    } else {
      ROLE_PERMISSIONS.admin_dokumen[m] = VIEW_ONLY;
    }
  });

  modules.forEach((m) => { ROLE_PERMISSIONS.tour_leader[m] = VIEW_ONLY; });
  modules.forEach((m) => { ROLE_PERMISSIONS.jamaah[m] = NONE; });
}

buildMatrix();

// ── Module-based helpers (preserved for API route guards) ────

export function canAccessModule(role: OperationalRole, module: string): PermissionCheck {
  return ROLE_PERMISSIONS[role]?.[module] ?? NONE;
}

export function hasModulePermission(role: OperationalRole, module: PermissionModule, action: PermissionAction): boolean {
  const check = ROLE_PERMISSIONS[role]?.[module] ?? NONE;
  switch (action) {
    case "view":     return check.canView;
    case "create":   return check.canCreate;
    case "edit":     return check.canEdit;
    case "approve":  return check.canApprove;
    case "export":   return check.canExport;
    case "delete":   return check.canDelete;
    default:         return false;
  }
}

// ── Server-side auth-aware check ──────────────────────────────

import type { Session } from "next-auth";

export function checkServerPermission(
  session: Session | null,
  module: PermissionModule,
  action: PermissionAction
): { allowed: false; reason: string } | { allowed: true } {
  if (!session?.user) {
    return { allowed: false, reason: "Unauthenticated" };
  }

  const role = session.user.role as OperationalRole;
  if (!role) {
    return { allowed: false, reason: "No role assigned" };
  }

  if (role === "super_admin") {
    return { allowed: true };
  }

  if (!hasModulePermission(role, module, action)) {
    return {
      allowed: false,
      reason: `Role ${role} lacks ${action} on ${module}`,
    };
  }

  return { allowed: true };
}

// ── Role labels ───────────────────────────────────────────────

const ROLE_LABELS: Record<OperationalRole, string> = {
  super_admin: "Super Admin",
  admin_operasional: "Admin Operasional",
  admin_pembayaran: "Admin Pembayaran",
  admin_manifest: "Admin Manifest",
  admin_dokumen: "Admin Dokumen",
  tour_leader: "Tour Leader",
  jamaah: "Jamaah",
};

export function getRoleLabel(role: OperationalRole): string {
  return ROLE_LABELS[role];
}

export function getEnterpriseRoleLabel(enterpriseRole: EnterpriseRole): string {
  const labels: Record<EnterpriseRole, string> = {
    SUPER_ADMIN: "Super Admin",
    OWNER: "Owner",
    ADMIN: "Admin",
    STAFF: "Staff",
    VIEWER: "Viewer",
  };
  return labels[enterpriseRole];
}

// ── Convenience guards (preserved) ────────────────────────────

export function isPrivilegedRole(role: OperationalRole): boolean {
  return ["super_admin", "admin_operasional"].includes(role);
}

export function canApprovePayments(role: OperationalRole): boolean {
  return hasModulePermission(role, "pembayaran", "approve");
}

export function canEditManifests(role: OperationalRole): boolean {
  return hasModulePermission(role, "manifest", "edit");
}

export function canAccessExports(role: OperationalRole): boolean {
  return hasModulePermission(role, "export", "export");
}
