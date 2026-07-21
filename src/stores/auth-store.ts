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

const OUTSIDE_WORK_HOURS_TIMEOUT = 3 * 60 * 60 * 1000; // 3 jam (10.800.000 ms)

export function evaluateSessionExpired(
  lastActivity: number,
  now: number = Date.now(),
  userRole?: OperationalRole
): boolean {
  if (!lastActivity) return false;

  // Aturan jam kerja 08:00-17:00 HANYA diperuntukkan bagi role ADMIN (bukan Jamaah)
  const isAdmin = userRole !== undefined && userRole !== "jamaah";

  if (!isAdmin) {
    // Untuk role Jamaah: batas inaktivitas 24 jam
    const JAMAAH_TIMEOUT = 24 * 60 * 60 * 1000;
    return now - lastActivity >= JAMAAH_TIMEOUT;
  }

  const lastDate = new Date(lastActivity);
  const nowDate = new Date(now);

  const nowHour = nowDate.getHours();
  const lastHour = lastDate.getHours();

  const isSameDay =
    nowDate.getFullYear() === lastDate.getFullYear() &&
    nowDate.getMonth() === lastDate.getMonth() &&
    nowDate.getDate() === lastDate.getDate();

  // Aksi terakhir pada jam kerja Admin (08:00 - 16:59:59)
  const lastWasInWorkHours = lastHour >= 8 && lastHour < 17;

  if (isSameDay && lastWasInWorkHours) {
    // Jika sudah mencapai/melewati jam 17:00 (5 sore) tanpa aktivitas setelah jam 17:00
    if (nowHour >= 17) {
      return true;
    }
    // Selama jam kerja (08:00 - 16:59:59), Admin tetap login terus
    return false;
  }

  // Di luar jam kerja Admin (< 08:00 atau >= 17:00) atau beda hari: logout jika inaktif 3 jam
  const inactiveDuration = now - lastActivity;
  return inactiveDuration >= OUTSIDE_WORK_HOURS_TIMEOUT;
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
