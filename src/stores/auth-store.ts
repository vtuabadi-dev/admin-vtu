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

  login: (email: string, password: string, loginType: "admin" | "jamaah") => Promise<void>;
  logout: () => void;
  refreshSession: () => void;
  updateActivity: () => void;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
  checkSessionExpired: () => boolean;
}

const MOCK_CREDENTIALS: Record<string, { password: string; role: OperationalRole; name: string }> = {
  "superadmin@vtu.id": { password: "SuperAdmin123!", role: "super_admin", name: "Super Admin" },
  "admin@vtu.id": { password: "admin123", role: "super_admin", name: "Super Admin (Legacy)" },
  "ops@vtu.id": { password: "admin123", role: "admin_operasional", name: "Admin Operasional" },
  "finance@vtu.id": { password: "admin123", role: "admin_pembayaran", name: "Admin Pembayaran" },
  "manifest@vtu.id": { password: "admin123", role: "admin_manifest", name: "Admin Manifest" },
  "docs@vtu.id": { password: "admin123", role: "admin_dokumen", name: "Admin Dokumen" },
  "tl@vtu.id": { password: "admin123", role: "tour_leader", name: "Tour Leader" },
  "jamaah@vtu.id": { password: "admin123", role: "jamaah", name: "Jamaah Demo" },
};

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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

      login: async (email: string, password: string, loginType: "admin" | "jamaah") => {
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

              // Validate login type matches role
              if (loginType === "admin" && userRole === "jamaah") {
                await signOut({ redirect: false });
                set({ loginError: "Akun ini adalah akun jamaah. Gunakan tab Jamaah Login.", isLoading: false });
                return;
              }
              if (loginType === "jamaah" && userRole !== "jamaah") {
                await signOut({ redirect: false });
                set({ loginError: "Akun ini adalah akun admin. Gunakan tab Admin Login.", isLoading: false });
                return;
              }

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
            // session fetch failed — fall through to mock
          }
        } catch {
          // Network error — fall through to mock
        }

        // Fallback: mock credentials (offline / dev without DB)
        const cred = MOCK_CREDENTIALS[normalizedEmail];
        if (!cred || cred.password !== password) {
          set({ loginError: "Email atau password salah", isLoading: false });
          return;
        }

        if (loginType === "admin" && cred.role === "jamaah") {
          set({ loginError: "Akun ini adalah akun jamaah. Gunakan tab Jamaah Login.", isLoading: false });
          return;
        }
        if (loginType === "jamaah" && cred.role !== "jamaah") {
          set({ loginError: "Akun ini adalah akun admin. Gunakan tab Admin Login.", isLoading: false });
          return;
        }

        set({
          user: {
            id: `usr-${normalizedEmail.replace(/[^a-z0-9]/g, "-")}`,
            name: cred.name,
            email: normalizedEmail,
            role: cred.role,
          },
          isAuthenticated: true,
          loginError: null,
          lastActivity: Date.now(),
          sessionExpired: false,
        });
      },

      logout: () => {
        signOut({ redirect: false }).catch(() => {});
        set({
          user: null,
          isAuthenticated: false,
          loginError: null,
          sessionExpired: false,
          lastActivity: 0,
        });
      },

      refreshSession: () => {
        set({ lastActivity: Date.now(), sessionExpired: false });
      },

      updateActivity: () => {
        const { isAuthenticated, lastActivity, sessionExpired } = get();
        if (!isAuthenticated || sessionExpired) return;

        const now = Date.now();
        if (now - lastActivity > INACTIVITY_TIMEOUT) {
          set({ sessionExpired: true });
        } else {
          set({ lastActivity: now });
        }
      },

      clearError: () => set({ loginError: null }),

      setRememberMe: (value: boolean) => set({ rememberMe: value }),

      checkSessionExpired: () => {
        const { lastActivity, isAuthenticated } = get();
        if (!isAuthenticated) return false;
        const expired = Date.now() - lastActivity > INACTIVITY_TIMEOUT;
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
