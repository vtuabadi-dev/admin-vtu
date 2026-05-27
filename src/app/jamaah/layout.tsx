"use client";

import { SessionGuard } from "@/shared/components/SessionGuard";
import { Shell } from "@/shared/components/layout/Shell";

export default function JamaahLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard requiredRole="jamaah">
      <Shell role="jamaah">{children}</Shell>
    </SessionGuard>
  );
}
