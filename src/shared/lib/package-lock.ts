import type { Keberangkatan } from "@/shared/types";

export type LockStatus = "unlocked" | "locked" | "finalized";
export type LockedModule = "pembayaran" | "manifest" | "rooming" | "hotel";

export interface PackageLockState {
  status: LockStatus;
  lockedAt?: string;
  lockedBy?: string;
  lockedModules: LockedModule[];
}

const ALL_MODULES: LockedModule[] = ["pembayaran", "manifest", "rooming", "hotel"];

export function computePackageLockState(kbr: Keberangkatan): PackageLockState {
  const isFinalized = kbr.status === "ready" || kbr.status === "completed" || kbr.status === "departed";

  if (isFinalized) {
    return {
      status: kbr.status === "departed" ? "finalized" : "locked",
      lockedAt: new Date().toISOString(),
      lockedBy: "system",
      lockedModules: [...ALL_MODULES],
    };
  }

  return {
    status: "unlocked",
    lockedModules: [],
  };
}

export function canEditModule(
  lockState: PackageLockState,
  module: LockedModule,
  hasUnlockPermission = false
): boolean {
  if (lockState.status === "unlocked") return true;
  if (hasUnlockPermission) return true;
  return !lockState.lockedModules.includes(module);
}

export function getLockStatusLabel(status: LockStatus): string {
  switch (status) {
    case "unlocked":
      return "Terbuka";
    case "locked":
      return "Terkunci";
    case "finalized":
      return "Final";
  }
}

export function getLockWarningMessage(module: LockedModule): string {
  const labels: Record<LockedModule, string> = {
    pembayaran: "Pembayaran",
    manifest: "Manifest",
    rooming: "Rooming",
    hotel: "Hotel",
  };
  return `Paket sudah dikunci. ${labels[module]} tidak dapat diedit. Hubungi super admin untuk unlock.`;
}
