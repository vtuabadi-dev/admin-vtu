"use client";

import { SessionGuard } from "@/shared/components/SessionGuard";
import { Shell } from "@/shared/components/layout/Shell";
import { useSession } from "@/shared/hooks/use-session";

export default function JamaahLayout({ children }: { children: React.ReactNode }) {
  const { role } = useSession();

  return (
    <SessionGuard requiredRole="jamaah">
      <Shell role={role ?? "jamaah"}>{children}</Shell>
    </SessionGuard>
  );
}
