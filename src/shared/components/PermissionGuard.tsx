"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { getUserRole } from "@/services/mock/handlers";
import { canAccessModule } from "@/shared/lib/rbac-utils";
import type { PermissionCheck } from "@/shared/types";

interface PermissionGuardProps {
  module: string;
  required?: "view" | "edit" | "delete" | "export";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ module, required = "view", children, fallback }: PermissionGuardProps) {
  const [check, setCheck] = useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRole().then((role) => {
      setCheck(canAccessModule(role, module));
      setLoading(false);
    });
  }, [module]);

  if (loading) return null;

  if (!check) return null;

  const allowed =
    required === "view" ? check.canView :
    required === "edit" ? check.canEdit :
    required === "delete" ? check.canDelete :
    check.canExport;

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="text-sm font-semibold">Akses Dibatasi</h3>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          Anda tidak memiliki izin untuk mengakses modul ini. Hubungi Super Admin untuk perubahan hak akses.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function usePermission(module: string) {
  const [check, setCheck] = useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRole().then((role) => {
      setCheck(canAccessModule(role, module));
      setLoading(false);
    });
  }, [module]);

  return { permission: check, loading };
}
