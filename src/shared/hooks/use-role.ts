"use client";

import type { OperationalRole } from "@/shared/types";
import { useAuthStore } from "@/stores/auth-store";

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role: OperationalRole = user?.role ?? "jamaah";

  return { role, loading: false, isSuperAdmin: role === "super_admin" };
}
