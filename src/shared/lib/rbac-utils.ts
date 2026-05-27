import type { OperationalRole, PermissionCheck, PermissionAction, PermissionModule } from "@/shared/types";

// ── Permission Matrix ─────────────────────────────────────────

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
  ];

  // Super Admin — all access
  modules.forEach((m) => { ROLE_PERMISSIONS.super_admin[m] = FULL; });

  // Admin Operasional — full access, except backup (view only)
  modules.forEach((m) => {
    ROLE_PERMISSIONS.admin_operasional[m] = m === "backup" ? VIEW_ONLY : (m === "sistem" ? FULL_NO_DELETE : FULL);
  });

  // Admin Pembayaran — pembayaran/invoice/jamaah full, rest view
  modules.forEach((m) => {
    if (m === "pembayaran" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_pembayaran[m] = FULL;
    } else if (m === "export") {
      ROLE_PERMISSIONS.admin_pembayaran[m] = VIEW_EXPORT;
    } else {
      ROLE_PERMISSIONS.admin_pembayaran[m] = VIEW_ONLY;
    }
  });

  // Admin Manifest — manifest/rooming/jamaah full, dokumen view/edit, no payment
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

  // Admin Dokumen — only dokumen/jamaah full
  modules.forEach((m) => {
    if (m === "dokumen" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_dokumen[m] = FULL_NO_DELETE;
    } else {
      ROLE_PERMISSIONS.admin_dokumen[m] = VIEW_ONLY;
    }
  });

  // Tour Leader — view only
  modules.forEach((m) => { ROLE_PERMISSIONS.tour_leader[m] = VIEW_ONLY; });

  // Jamaah — no admin access
  modules.forEach((m) => { ROLE_PERMISSIONS.jamaah[m] = NONE; });
}

buildMatrix();

// ── Client-side helpers ───────────────────────────────────────

export function canAccessModule(role: OperationalRole, module: string): PermissionCheck {
  return ROLE_PERMISSIONS[role]?.[module] ?? NONE;
}

export function hasPermission(role: OperationalRole, module: PermissionModule, action: PermissionAction): boolean {
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

  // Super admin bypass
  if (role === "super_admin") {
    return { allowed: true };
  }

  if (!hasPermission(role, module, action)) {
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

// ── Audit module helper ───────────────────────────────────────

export function isPrivilegedRole(role: OperationalRole): boolean {
  return ["super_admin", "admin_operasional"].includes(role);
}

export function canApprovePayments(role: OperationalRole): boolean {
  return hasPermission(role, "pembayaran", "approve");
}

export function canEditManifests(role: OperationalRole): boolean {
  return hasPermission(role, "manifest", "edit");
}

export function canAccessExports(role: OperationalRole): boolean {
  return hasPermission(role, "export", "export");
}
