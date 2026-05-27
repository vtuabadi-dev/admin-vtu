"use client";

import type { ReactNode } from "react";
import { useRole } from "@/shared/hooks/use-role";
import { canAccessModule } from "@/shared/lib/rbac-utils";

interface RequirePermissionProps {
  module: string;
  action?: "canView" | "canEdit" | "canDelete" | "canExport";
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  module,
  action = "canView",
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { role, loading } = useRole();

  if (loading) return null;

  const perms = canAccessModule(role, module);
  if (perms[action]) return <>{children}</>;

  return <>{fallback}</>;
}
