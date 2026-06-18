"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { canAccessModule } from "@/shared/lib/rbac-utils";
import type { PermissionAction } from "@/shared/types";

interface PermissionGuardProps {
  module: string;
  required?: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ module, required = "view", children, fallback }: PermissionGuardProps) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real session dari Auth.js
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        const role = session?.user?.role || "jamaah";
        const check = canAccessModule(role, module);
        // Map short action name to PermissionCheck key (e.g. "view" → "canView")
        const actionKey = `can${required.charAt(0).toUpperCase()}${required.slice(1)}` as keyof typeof check;
        setAllowed(!!check[actionKey]);
      })
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false));
  }, [module, required]);

  if (loading) return null;

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
