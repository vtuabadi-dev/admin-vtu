"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { OperationalRole } from "@/shared/types";

export function useSession() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginError = useAuthStore((s) => s.loginError);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const updateActivity = useAuthStore((s) => s.updateActivity);
  const clearError = useAuthStore((s) => s.clearError);
  const checkSessionExpired = useAuthStore((s) => s.checkSessionExpired);

  return {
    user,
    role: user?.role as OperationalRole | undefined,
    isAuthenticated,
    isLoading,
    loginError,
    sessionExpired,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: user?.role !== "jamaah" && user?.role !== undefined,
    isJamaah: user?.role === "jamaah",
    login,
    logout,
    refreshSession,
    updateActivity,
    clearError,
    checkSessionExpired,
  };
}
