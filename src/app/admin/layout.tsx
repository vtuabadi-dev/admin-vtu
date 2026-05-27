"use client";

import { SessionGuard } from "@/shared/components/SessionGuard";
import { Shell } from "@/shared/components/layout/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard requiredRole="admin">
      <Shell role="admin">{children}</Shell>
    </SessionGuard>
  );
}
