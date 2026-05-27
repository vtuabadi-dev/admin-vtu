import type { OperationalRole, PermissionCheck } from "@/shared/types";

const ROLE_PERMISSIONS: Record<OperationalRole, Record<string, PermissionCheck>> = {
  super_admin: {},
  admin_operasional: {},
  admin_pembayaran: {},
  admin_manifest: {},
  admin_dokumen: {},
  tour_leader: {},
  jamaah: {},
};

const FULL: PermissionCheck = { canView: true, canEdit: true, canDelete: true, canExport: true };
const VIEW_EXPORT: PermissionCheck = { canView: true, canEdit: false, canDelete: false, canExport: true };
const VIEW_ONLY: PermissionCheck = { canView: true, canEdit: false, canDelete: false, canExport: false };
const NONE: PermissionCheck = { canView: false, canEdit: false, canDelete: false, canExport: false };

// Build permission matrix
function buildMatrix() {
  const modules = ["dokumen", "pembayaran", "manifest", "rooming", "keberangkatan", "jamaah", "sistem"];

  // Super Admin — all access
  modules.forEach((m) => {
    ROLE_PERMISSIONS.super_admin[m] = FULL;
  });

  // Admin Operasional — full access to operations, view-only for payment
  modules.forEach((m) => {
    ROLE_PERMISSIONS.admin_operasional[m] = m === "pembayaran" ? VIEW_EXPORT : FULL;
  });

  // Admin Pembayaran — only pembayaran/invoice/jamaah
  modules.forEach((m) => {
    if (m === "pembayaran" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_pembayaran[m] = FULL;
    } else {
      ROLE_PERMISSIONS.admin_pembayaran[m] = VIEW_ONLY;
    }
  });

  // Admin Manifest — manifest/rooming/dokumen/jamaah, no payment
  modules.forEach((m) => {
    if (m === "manifest" || m === "rooming" || m === "dokumen" || m === "jamaah" || m === "keberangkatan") {
      ROLE_PERMISSIONS.admin_manifest[m] = FULL;
    } else {
      ROLE_PERMISSIONS.admin_manifest[m] = VIEW_ONLY;
    }
  });

  // Admin Dokumen — only dokumen/jamaah
  modules.forEach((m) => {
    if (m === "dokumen" || m === "jamaah") {
      ROLE_PERMISSIONS.admin_dokumen[m] = FULL;
    } else {
      ROLE_PERMISSIONS.admin_dokumen[m] = VIEW_ONLY;
    }
  });

  // Tour Leader — view only
  modules.forEach((m) => {
    ROLE_PERMISSIONS.tour_leader[m] = VIEW_ONLY;
  });

  // Jamaah — no access to admin modules
  modules.forEach((m) => {
    ROLE_PERMISSIONS.jamaah[m] = NONE;
  });
}

buildMatrix();

export function canAccessModule(role: OperationalRole, module: string): PermissionCheck {
  return ROLE_PERMISSIONS[role]?.[module] ?? NONE;
}

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
