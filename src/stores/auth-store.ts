import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signIn, signOut } from "next-auth/react";
import type { OperationalRole } from "@/shared/types";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: OperationalRole;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  rememberMe: boolean;
  lastActivity: number;
  sessionExpired: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => void;
  updateActivity: () => void;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
  checkSessionExpired: () => boolean;
}
// ADR-0027: Selama user tidak menekan tombol Logout (Keluar), sesi tidak boleh otomatis close/logout.
export function evaluateSessionExpired(
  _lastActivity: number,
  _now: number = Date.now(),
  _userRole?: OperationalRole
): boolean {
  // Sesi persisten aktif terus menerus sampai pengguna melakukan logout eksplisit
  return false;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      loginError: null,
      rememberMe: false,
      lastActivity: Date.now(),
      sessionExpired: false,

      login: async (email: string, password: string) => {
        const normalizedEmail = email.toLowerCase().trim();

        try {
          const result = await signIn("credentials", {
            email: normalizedEmail,
            password,
            redirect: false,
          });

          if (result?.error) {
            set({ loginError: "Email atau password salah", isLoading: false });
            return;
          }

          // Fetch session to get user data with role
          try {
            const res = await fetch("/api/auth/session");
            const session = await res.json();
            if (session?.user) {
              const userRole = session.user.role as OperationalRole;

              set({
                user: {
                  id: session.user.id ?? `usr-${normalizedEmail.replace(/[^a-z0-9]/g, "-")}`,
                  name: session.user.name ?? "",
                  email: session.user.email ?? normalizedEmail,
                  role: userRole,
                },
                isAuthenticated: true,
                loginError: null,
                lastActivity: Date.now(),
                sessionExpired: false,
              });
              return;
            }
          } catch {
            set({ loginError: "Gagal mengambil sesi dari server.", isLoading: false });
            return;
          }
        } catch {
          set({ loginError: "Koneksi ke server gagal.", isLoading: false });
          return;
        }
      },

      logout: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("vtu-auth-storage");
            localStorage.removeItem("vtu_intro_completed");
            localStorage.removeItem("vtu_intro_played");
            sessionStorage.removeItem("vtu_intro_played");
          } catch {}
        }
        set({
          user: null,
          isAuthenticated: false,
          loginError: null,
          sessionExpired: false,
          lastActivity: 0,
        });
        signOut({ redirect: false }).catch(() => {});
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      },

      refreshSession: () => {
        set({ lastActivity: Date.now(), sessionExpired: false });
      },

      updateActivity: () => {
        const { isAuthenticated, lastActivity, sessionExpired, user } = get();
        if (!isAuthenticated || sessionExpired) return;

        const now = Date.now();
        if (evaluateSessionExpired(lastActivity, now, user?.role)) {
          set({ sessionExpired: true });
        } else {
          set({ lastActivity: now });
        }
      },

      clearError: () => set({ loginError: null }),

      setRememberMe: (value: boolean) => set({ rememberMe: value }),

      checkSessionExpired: () => {
        const { lastActivity, isAuthenticated, user } = get();
        if (!isAuthenticated) return false;
        const expired = evaluateSessionExpired(lastActivity, Date.now(), user?.role);
        if (expired) {
          set({ sessionExpired: true });
        }
        return expired;
      },
    }),
    {
      name: "vtu-auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
        lastActivity: state.lastActivity,
      } as Partial<AuthState>),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.sessionExpired = false;

          // If we have stored auth, validate against server session
          if (state.isAuthenticated && state.user) {
            state.lastActivity = Date.now();
            // Verify server session is still valid (async, non-blocking)
            fetch("/api/auth/session")
              .then((res) => res.json())
              .then((session) => {
                if (!session?.user) {
                  // Server session expired — clear client state
                  useAuthStore.setState({
                    user: null,
                    isAuthenticated: false,
                    sessionExpired: false,
                    lastActivity: 0,
                  });
                }
              })
              .catch(() => {
                // Network error — keep local state (offline support)
              });
          }
        }
      },
    }
  )
);
